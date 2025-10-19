import asyncio
import logging
import time
from typing import Dict, List, Optional, Tuple
from enum import Enum
import aiohttp
import json

from ..core.config import config
from ..core.prompts import ModelSpecificPrompts

logger = logging.getLogger(__name__)

class AIProvider(Enum):
    OPENAI = "openai"
    GEMINI = "gemini"
    TOGETHER = "together"

class CircuitBreakerState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    """Circuit breaker pattern implementation for AI providers."""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = CircuitBreakerState.CLOSED
    
    def can_execute(self) -> bool:
        """Check if the circuit breaker allows execution."""
        if self.state == CircuitBreakerState.CLOSED:
            return True
        elif self.state == CircuitBreakerState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitBreakerState.HALF_OPEN
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def on_success(self):
        """Handle successful execution."""
        self.failure_count = 0
        self.state = CircuitBreakerState.CLOSED
        logger.info("Circuit breaker reset to CLOSED state")
    
    def on_failure(self):
        """Handle failed execution."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitBreakerState.OPEN
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")
        else:
            logger.warning(f"Circuit breaker failure count: {self.failure_count}/{self.failure_threshold}")

class AIService:
    """Enhanced AI service with three-tier fallback system."""
    
    def __init__(self):
        self.circuit_breakers = {
            AIProvider.OPENAI: CircuitBreaker(
                config.settings.circuit_breaker_failure_threshold,
                config.settings.circuit_breaker_recovery_timeout
            ),
            AIProvider.GEMINI: CircuitBreaker(
                config.settings.circuit_breaker_failure_threshold,
                config.settings.circuit_breaker_recovery_timeout
            ),
            AIProvider.TOGETHER: CircuitBreaker(
                config.settings.circuit_breaker_failure_threshold,
                config.settings.circuit_breaker_recovery_timeout
            )
        }
        self.provider_stats = {
            provider: {"requests": 0, "successes": 0, "failures": 0, "avg_response_time": 0}
            for provider in AIProvider
        }
    
    async def enhance_prompt(self, prompt: str, target_model: str = "auto") -> Tuple[str, AIProvider]:
        """
        Enhance prompt using three-tier fallback system.
        
        Args:
            prompt: The original prompt to enhance
            target_model: Target AI model (auto-detected if "auto")
        
        Returns:
            Tuple of (enhanced_prompt, provider_used)
        """
        providers = self._get_available_providers()
        
        if not providers:
            raise ValueError("No AI providers available")
        
        for provider in providers:
            try:
                if not self.circuit_breakers[provider].can_execute():
                    logger.warning(f"Circuit breaker open for {provider.value}")
                    continue
                
                start_time = time.time()
                enhanced_prompt = await self._enhance_with_provider(prompt, provider, target_model)
                response_time = time.time() - start_time
                
                # Update statistics
                self._update_stats(provider, True, response_time)
                self.circuit_breakers[provider].on_success()
                
                logger.info(f"Successfully enhanced prompt using {provider.value} in {response_time:.2f}s")
                return enhanced_prompt, provider
                
            except Exception as e:
                self._update_stats(provider, False)
                self.circuit_breakers[provider].on_failure()
                logger.error(f"Failed to enhance prompt with {provider.value}: {str(e)}")
                continue
        
        raise Exception("All AI providers failed")
    
    def _get_available_providers(self) -> List[AIProvider]:
        """Get list of available providers based on configuration."""
        providers = []
        
        if (config.settings.openai_api_key and 
            config.settings.openai_api_key != "your_openai_api_key_here"):
            providers.append(AIProvider.OPENAI)
        
        if (config.settings.gemini_api_key and 
            config.settings.gemini_api_key != "your_gemini_api_key_here"):
            providers.append(AIProvider.GEMINI)
        
        if (config.settings.together_api_key and 
            config.settings.together_api_key != "your_together_api_key_here"):
            providers.append(AIProvider.TOGETHER)
        
        return providers
    
    async def _enhance_with_provider(self, prompt: str, provider: AIProvider, target_model: str) -> str:
        """Enhance prompt using specific provider."""
        if provider == AIProvider.OPENAI:
            return await self._enhance_with_openai(prompt, target_model)
        elif provider == AIProvider.GEMINI:
            return await self._enhance_with_gemini(prompt, target_model)
        elif provider == AIProvider.TOGETHER:
            return await self._enhance_with_together(prompt, target_model)
        else:
            raise ValueError(f"Unknown provider: {provider}")
    
    async def _enhance_with_openai(self, prompt: str, target_model: str) -> str:
        """Enhance prompt using OpenAI API."""
        headers = {
            "Authorization": f"Bearer {config.settings.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        # Use centralized system prompts for consistency across providers
        system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)
        
        data = {
            "model": "gpt-5-nano",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 500,
            "temperature": 0.3
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    raise Exception(f"OpenAI API error: {response.status}")
                
                result = await response.json()
                return result["choices"][0]["message"]["content"]
    
    async def _enhance_with_openai_streaming(self, prompt: str, target_model: str):
        """Enhance prompt using OpenAI API with REAL streaming."""
        headers = {
            "Authorization": f"Bearer {config.settings.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        # Use centralized system prompts for consistency across providers
        system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)
        
        data = {
            "model": "gpt-5-nano",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 500,
            "temperature": 0.3,
            "stream": True
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    raise Exception(f"OpenAI API error: {response.status}")
                
                # Stream the response
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith('data: '):
                        data_str = line[6:]
                        if data_str == '[DONE]':
                            break
                        try:
                            chunk = json.loads(data_str)
                            if 'choices' in chunk and len(chunk['choices']) > 0:
                                delta = chunk['choices'][0].get('delta', {})
                                if 'content' in delta:
                                    yield delta['content']
                        except json.JSONDecodeError:
                            continue
    
    async def _enhance_with_gemini(self, prompt: str, target_model: str) -> str:
        """Enhance prompt using Gemini API with system prompts from prompts.py."""
        headers = {
            "Content-Type": "application/json"
        }

        # Centralized system prompt
        system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)

        # Choose model endpoint from target_model if present; fallback to gemini-2.0-flash-exp
        model_name = (target_model or "").strip() or "gemini-2.0-flash-exp"
        if not model_name.lower().startswith("gemini"):
            model_name = "gemini-2.0-flash-exp"

        # Gemini v1beta supports systemInstruction separately
        data = {
            "systemInstruction": {
                "role": "system",
                "parts": [{"text": system_prompt}]
            },
            "contents": [{
                "role": "user",
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 2000
            }
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={config.settings.gemini_api_key}",
                headers=headers,
                json=data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    body = await response.text()
                    raise Exception(f"Gemini API error: {response.status} {body}")

                result = await response.json()
                # Defensive extraction
                try:
                    return result["candidates"][0]["content"]["parts"][0]["text"]
                except Exception:
                    # Some responses use 'text' at root in newer variants
                    return result.get("text") or ""
    
    async def _enhance_with_together(self, prompt: str, target_model: str) -> str:
        """Enhance prompt using Together API."""
        headers = {
            "Authorization": f"Bearer {config.settings.together_api_key}",
            "Content-Type": "application/json"
        }
        
        # Use centralized system prompts for consistency across providers
        system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)
        
        data = {
            "model": "meta-llama/Llama-2-70b-chat-hf",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2000,
            "temperature": 0.7
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.together.xyz/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status != 200:
                    raise Exception(f"Together API error: {response.status}")
                
                result = await response.json()
                return result["choices"][0]["message"]["content"]
    
    def _get_system_prompt_for_model(self, target_model: str) -> str:
        """Get appropriate system prompt based on target model. Strictly prevent answering the prompt."""
        base_prompt = (
            "You are an expert AI prompt enhancer. Your job is to REWRITE the user's prompt so that another LLM can answer it better.\n"
            "Rules (MUST FOLLOW):\n"
            "- NEVER answer the user's prompt.\n"
            "- NEVER include explanations, disclaimers, or extra commentary.\n"
            "- Output ONLY the rewritten/enhanced prompt, nothing else.\n"
            "- Keep the user's original intent.\n"
            "- Improve clarity, add missing context, specify desired format, constraints, and examples when helpful.\n"
            "- Do NOT wrap the output in quotes or code fences.\n"
        )
        
        model_specific_prompts = {
            "chatgpt": base_prompt + "\n\nOptimize for ChatGPT's conversational style and capabilities.",
            "claude": base_prompt + "\n\nOptimize for Claude's analytical and detailed response style.",
            "gemini": base_prompt + "\n\nOptimize for Gemini's multimodal and creative capabilities.",
            "perplexity": base_prompt + "\n\nOptimize for Perplexity's search and research capabilities.",
            "poe": base_prompt + "\n\nOptimize for Poe's multi-model platform capabilities."
        }
        
        return model_specific_prompts.get(target_model.lower(), base_prompt)
    
    def _update_stats(self, provider: AIProvider, success: bool, response_time: float = 0):
        """Update provider statistics."""
        stats = self.provider_stats[provider]
        stats["requests"] += 1
        
        if success:
            stats["successes"] += 1
            # Update average response time
            if stats["avg_response_time"] == 0:
                stats["avg_response_time"] = response_time
            else:
                stats["avg_response_time"] = (stats["avg_response_time"] + response_time) / 2
        else:
            stats["failures"] += 1
    
    def get_provider_stats(self) -> Dict:
        """Get statistics for all providers."""
        return {
            provider.value: {
                **stats,
                "success_rate": stats["successes"] / stats["requests"] if stats["requests"] > 0 else 0,
                "circuit_breaker_state": self.circuit_breakers[provider].state.value
            }
            for provider, stats in self.provider_stats.items()
        }
    
    async def health_check(self) -> Dict:
        """Perform health check for all providers."""
        health_status = {}
        
        for provider in AIProvider:
            try:
                if not self.circuit_breakers[provider].can_execute():
                    health_status[provider.value] = {
                        "status": "unavailable",
                        "reason": "circuit_breaker_open"
                    }
                    continue
                
                # Simple health check with minimal prompt
                test_prompt = "Hello"
                start_time = time.time()
                await self._enhance_with_provider(test_prompt, provider, "auto")
                response_time = time.time() - start_time
                
                health_status[provider.value] = {
                    "status": "healthy",
                    "response_time": response_time
                }
                
            except Exception as e:
                health_status[provider.value] = {
                    "status": "unhealthy",
                    "error": str(e)
                }
        
        return health_status
    
    def is_healthy(self) -> bool:
        """Simple health check for the AI service."""
        try:
            # Check if we have at least one provider configured
            configured_providers = []
            if self.openai_api_key and self.openai_api_key != "your_openai_api_key_here":
                configured_providers.append("openai")
            if self.gemini_api_key and self.gemini_api_key != "your_gemini_api_key_here":
                configured_providers.append("gemini")
            if self.together_api_key and self.together_api_key != "your_together_api_key_here":
                configured_providers.append("together")
            
            return len(configured_providers) > 0
        except Exception:
            return False

# Global AI service instance
ai_service = AIService() 


