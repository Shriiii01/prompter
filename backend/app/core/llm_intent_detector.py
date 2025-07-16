import logging
import json
import time
import hashlib
from typing import Dict, List, Optional, Union
from dataclasses import dataclass
from functools import wraps
from openai import OpenAI
from anthropic import Anthropic
import redis
import asyncio
from concurrent.futures import ThreadPoolExecutor
from .intent_detector import PromptIntent, IntentResult, IntentDetector

logger = logging.getLogger(__name__)

@dataclass
class APIUsageStats:
    """Track API usage statistics"""
    total_calls: int = 0
    cached_calls: int = 0
    failed_calls: int = 0
    total_tokens: int = 0
    total_cost: float = 0.0
    last_reset: float = 0.0

class RateLimiter:
    """Simple rate limiter for API calls"""
    def __init__(self, max_calls: int = 100, window_seconds: int = 60):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self.calls = []
    
    def can_make_call(self) -> bool:
        """Check if we can make another API call"""
        now = time.time()
        # Remove old calls outside the window
        self.calls = [call_time for call_time in self.calls if now - call_time < self.window_seconds]
        return len(self.calls) < self.max_calls
    
    def record_call(self):
        """Record a new API call"""
        self.calls.append(time.time())

class LLMIntentDetector:
    """
    Production-ready LLM-based intent detector with caching, rate limiting, 
    fallbacks, and cost optimization.
    """
    
    # Cost per 1K tokens (approximate)
    TOKEN_COSTS = {
        "gpt-4o": {"input": 0.005, "output": 0.015},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
        "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
        "claude-3-haiku": {"input": 0.00025, "output": 0.00125},
        "claude-3-sonnet": {"input": 0.003, "output": 0.015}
    }
    
    def __init__(self, 
                 openai_api_key: Optional[str] = None,
                 anthropic_api_key: Optional[str] = None,
                 model: str = "gpt-4o-mini",  # Cost-optimized default
                 provider: str = "openai",
                 cache_ttl: int = 3600,  # 1 hour cache
                 rate_limit: int = 100,  # 100 calls per minute
                 redis_url: str = "redis://localhost:6379",
                 enable_fallback: bool = True,
                 timeout: int = 30):
        
        self.model = model
        self.provider = provider
        self.cache_ttl = cache_ttl
        self.enable_fallback = enable_fallback
        self.timeout = timeout
        self.stats = APIUsageStats()
        self.stats.last_reset = time.time()
        
        # Initialize rate limiter
        self.rate_limiter = RateLimiter(max_calls=rate_limit, window_seconds=60)
        
        # Initialize clients
        self.openai_client = None
        self.anthropic_client = None
        self.fallback_detector = None
        
        if openai_api_key:
            self.openai_client = OpenAI(api_key=openai_api_key)
        
        if anthropic_api_key:
            self.anthropic_client = Anthropic(api_key=anthropic_api_key)
        
        # Initialize fallback (rule-based detector)
        if enable_fallback:
            self.fallback_detector = IntentDetector()
        
        # Initialize cache
        self.cache = None
        try:
            self.cache = redis.Redis.from_url(redis_url, decode_responses=True)
            self.cache.ping()  # Test connection
            logger.info("Redis cache initialized successfully")
        except Exception as e:
            logger.warning(f"Redis cache initialization failed: {e}")
            self.cache = {}  # Use dict as fallback cache
    
    def _get_cache_key(self, prompt: str) -> str:
        """Generate cache key for prompt"""
        return f"intent_detection:{hashlib.md5(prompt.encode()).hexdigest()}"
    
    def _get_from_cache(self, prompt: str) -> Optional[IntentResult]:
        """Get cached result for prompt"""
        try:
            cache_key = self._get_cache_key(prompt)
            
            if isinstance(self.cache, dict):
                cached_data = self.cache.get(cache_key)
            else:
                cached_data = self.cache.get(cache_key)
            
            if cached_data:
                if isinstance(cached_data, str):
                    data = json.loads(cached_data)
                else:
                    data = cached_data
                
                # Reconstruct IntentResult
                return IntentResult(
                    primary_intent=PromptIntent(data["primary_intent"]),
                    secondary_intents=[PromptIntent(intent) for intent in data["secondary_intents"]],
                    confidence=data["confidence"],
                    indicators=data["indicators"] + ["cached"],
                    context_type=data["context_type"],
                    complexity_level=data["complexity_level"]
                )
        except Exception as e:
            logger.error(f"Cache retrieval error: {e}")
        
        return None
    
    def _save_to_cache(self, prompt: str, result: IntentResult):
        """Save result to cache"""
        try:
            cache_key = self._get_cache_key(prompt)
            data = {
                "primary_intent": result.primary_intent.value,
                "secondary_intents": [intent.value for intent in result.secondary_intents],
                "confidence": result.confidence,
                "indicators": [ind for ind in result.indicators if ind != "cached"],
                "context_type": result.context_type,
                "complexity_level": result.complexity_level
            }
            
            if isinstance(self.cache, dict):
                self.cache[cache_key] = data
            else:
                self.cache.setex(cache_key, self.cache_ttl, json.dumps(data))
        except Exception as e:
            logger.error(f"Cache save error: {e}")
    
    def _estimate_cost(self, prompt: str, response: str) -> float:
        """Estimate API call cost"""
        if self.model not in self.TOKEN_COSTS:
            return 0.0
        
        # Rough token estimation (4 chars = 1 token)
        input_tokens = len(prompt) // 4
        output_tokens = len(response) // 4
        
        costs = self.TOKEN_COSTS[self.model]
        return (input_tokens * costs["input"] + output_tokens * costs["output"]) / 1000
    
    def _classify_with_openai(self, prompt: str) -> IntentResult:
        """Classify intent using OpenAI"""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
        
        system_message = (
            "You are an intent classifier. Classify the user's intent into one of: "
            "coding, writing, question, creative, analysis, conversation, "
            "task_completion, explanation, translation, brainstorming, debugging, review. "
            "Return ONLY a JSON object with keys 'intent' (one of the categories) and 'confidence' (0-1)."
        )
        
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ]
        
        response = self.openai_client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.0,
            max_tokens=50,
            timeout=self.timeout
        )
        
        content = response.choices[0].message.content.strip()
        
        # Estimate cost
        cost = self._estimate_cost(prompt + system_message, content)
        self.stats.total_cost += cost
        
        try:
            data = json.loads(content)
            label = data.get("intent", "unknown").lower()
            confidence = float(data.get("confidence", 0.8))
        except (json.JSONDecodeError, ValueError):
            # Fallback parsing
            label = content.strip().lower().replace(" ", "_")
            confidence = 0.6
        
        # Map to PromptIntent
        intent_mapping = {
            'coding': PromptIntent.CODING,
            'writing': PromptIntent.WRITING,
            'question': PromptIntent.QUESTION,
            'creative': PromptIntent.CREATIVE,
            'analysis': PromptIntent.ANALYSIS,
            'conversation': PromptIntent.CONVERSATION,
            'task_completion': PromptIntent.TASK_COMPLETION,
            'explanation': PromptIntent.EXPLANATION,
            'translation': PromptIntent.TRANSLATION,
            'brainstorming': PromptIntent.BRAINSTORMING,
            'debugging': PromptIntent.DEBUGGING,
            'review': PromptIntent.REVIEW
        }
        
        primary_intent = intent_mapping.get(label, PromptIntent.UNKNOWN)
        
        return IntentResult(
            primary_intent=primary_intent,
            secondary_intents=[],
            confidence=confidence,
            indicators=[f"llm_classified_{self.model}"],
            context_type="general",
            complexity_level="medium"
        )
    
    def _classify_with_anthropic(self, prompt: str) -> IntentResult:
        """Classify intent using Anthropic Claude"""
        if not self.anthropic_client:
            raise ValueError("Anthropic client not initialized")
        
        system_message = (
            "You are an intent classifier. Classify the user's intent into one of: "
            "coding, writing, question, creative, analysis, conversation, "
            "task_completion, explanation, translation, brainstorming, debugging, review. "
            "Return ONLY a JSON object with keys 'intent' (one of the categories) and 'confidence' (0-1)."
        )
        
        response = self.anthropic_client.messages.create(
            model=self.model,
            max_tokens=50,
            temperature=0.0,
            system=system_message,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text.strip()
        
        # Similar parsing logic as OpenAI
        try:
            data = json.loads(content)
            label = data.get("intent", "unknown").lower()
            confidence = float(data.get("confidence", 0.8))
        except (json.JSONDecodeError, ValueError):
            label = content.strip().lower().replace(" ", "_")
            confidence = 0.6
        
        # Map to PromptIntent (same mapping as OpenAI)
        intent_mapping = {
            'coding': PromptIntent.CODING,
            'writing': PromptIntent.WRITING,
            'question': PromptIntent.QUESTION,
            'creative': PromptIntent.CREATIVE,
            'analysis': PromptIntent.ANALYSIS,
            'conversation': PromptIntent.CONVERSATION,
            'task_completion': PromptIntent.TASK_COMPLETION,
            'explanation': PromptIntent.EXPLANATION,
            'translation': PromptIntent.TRANSLATION,
            'brainstorming': PromptIntent.BRAINSTORMING,
            'debugging': PromptIntent.DEBUGGING,
            'review': PromptIntent.REVIEW
        }
        
        primary_intent = intent_mapping.get(label, PromptIntent.UNKNOWN)
        
        return IntentResult(
            primary_intent=primary_intent,
            secondary_intents=[],
            confidence=confidence,
            indicators=[f"llm_classified_{self.model}"],
            context_type="general",
            complexity_level="medium"
        )
    
    def detect_intent(self, prompt: str) -> IntentResult:
        """
        Detect intent with caching, rate limiting, and fallbacks.
        """
        # Check cache first
        cached_result = self._get_from_cache(prompt)
        if cached_result:
            self.stats.cached_calls += 1
            logger.info(f"Cache hit for prompt: {prompt[:50]}...")
            return cached_result
        
        # Check rate limit
        if not self.rate_limiter.can_make_call():
            logger.warning("Rate limit exceeded, using fallback")
            if self.fallback_detector:
                result = self.fallback_detector.detect_intent(prompt)
                result.indicators.append("rate_limited_fallback")
                return result
            else:
                raise Exception("Rate limit exceeded and no fallback available")
        
        # Record API call
        self.rate_limiter.record_call()
        self.stats.total_calls += 1
        
        # Try LLM classification
        try:
            if self.provider == "openai" and self.openai_client:
                result = self._classify_with_openai(prompt)
            elif self.provider == "anthropic" and self.anthropic_client:
                result = self._classify_with_anthropic(prompt)
            else:
                raise ValueError(f"Provider {self.provider} not available")
            
            # Cache successful result
            self._save_to_cache(prompt, result)
            
            logger.info(f"LLM classification successful: {result.primary_intent.value} (confidence: {result.confidence})")
            return result
            
        except Exception as e:
            logger.error(f"LLM classification failed: {e}")
            self.stats.failed_calls += 1
            
            # Use fallback detector
            if self.fallback_detector:
                logger.info("Using fallback rule-based detection")
                result = self.fallback_detector.detect_intent(prompt)
                result.indicators.append("llm_failed_fallback")
                return result
            else:
                # Return unknown intent
                return IntentResult(
                    primary_intent=PromptIntent.UNKNOWN,
                    secondary_intents=[],
                    confidence=0.0,
                    indicators=["llm_failed_no_fallback"],
                    context_type="general",
                    complexity_level="unknown"
                )
    
    def detect_batch(self, prompts: List[str]) -> List[IntentResult]:
        """
        Detect intents for multiple prompts efficiently.
        """
        results = []
        
        # Check cache for all prompts first
        cached_results = {}
        uncached_prompts = []
        
        for prompt in prompts:
            cached_result = self._get_from_cache(prompt)
            if cached_result:
                cached_results[prompt] = cached_result
                self.stats.cached_calls += 1
            else:
                uncached_prompts.append(prompt)
        
        # Process uncached prompts
        if uncached_prompts:
            logger.info(f"Processing {len(uncached_prompts)} uncached prompts")
            
            # Use ThreadPoolExecutor for parallel processing
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {executor.submit(self.detect_intent, prompt): prompt 
                          for prompt in uncached_prompts}
                
                for future in futures:
                    try:
                        result = future.result(timeout=self.timeout)
                        prompt = futures[future]
                        cached_results[prompt] = result
                    except Exception as e:
                        logger.error(f"Batch processing error: {e}")
                        prompt = futures[future]
                        cached_results[prompt] = IntentResult(
                            primary_intent=PromptIntent.UNKNOWN,
                            secondary_intents=[],
                            confidence=0.0,
                            indicators=["batch_processing_failed"],
                            context_type="general",
                            complexity_level="unknown"
                        )
        
        # Return results in original order
        return [cached_results[prompt] for prompt in prompts]
    
    def get_stats(self) -> Dict:
        """Get usage statistics"""
        cache_hit_rate = (self.stats.cached_calls / max(1, self.stats.total_calls + self.stats.cached_calls)) * 100
        failure_rate = (self.stats.failed_calls / max(1, self.stats.total_calls)) * 100
        
        return {
            "total_calls": self.stats.total_calls,
            "cached_calls": self.stats.cached_calls,
            "failed_calls": self.stats.failed_calls,
            "cache_hit_rate": f"{cache_hit_rate:.1f}%",
            "failure_rate": f"{failure_rate:.1f}%",
            "total_cost": f"${self.stats.total_cost:.4f}",
            "model": self.model,
            "provider": self.provider
        }
    
    def reset_stats(self):
        """Reset usage statistics"""
        self.stats = APIUsageStats()
        self.stats.last_reset = time.time()
    
    def clear_cache(self):
        """Clear the cache"""
        try:
            if isinstance(self.cache, dict):
                self.cache.clear()
            else:
                # For Redis, we'd need to identify and delete our keys
                # For now, just log
                logger.info("Cache clear requested - manual Redis cleanup needed")
        except Exception as e:
            logger.error(f"Cache clear error: {e}") 