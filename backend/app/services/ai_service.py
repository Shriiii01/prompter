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
            if self.last_failure_time and time.time() - self.last_failure_time > self.recovery_timeout:
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
    """Simplified AI service strictly using OpenAI GPT-5 Mini."""
    
    def __init__(self):
        self.circuit_breaker = CircuitBreaker(
            config.settings.circuit_breaker_failure_threshold,
            config.settings.circuit_breaker_recovery_timeout
        )
        self.stats = {"requests": 0, "successes": 0, "failures": 0, "avg_response_time": 0}
    
    async def enhance_prompt(self, prompt: str, target_model: str = "gpt-5-mini") -> Tuple[str, AIProvider]:
        """
        Enhance prompt using strictly OpenAI GPT-5 Mini.
        """
        if not self.circuit_breaker.can_execute():
            raise Exception("OpenAI service unavailable (circuit breaker open)")
            
        start_time = time.time()
        try:
            enhanced_prompt = await self._enhance_with_openai(prompt, target_model)
            response_time = time.time() - start_time
            
            # Update statistics
            self._update_stats(True, response_time)
            self.circuit_breaker.on_success()
            
            logger.info(f"Successfully enhanced prompt using OpenAI in {response_time:.2f}s")
            return enhanced_prompt, AIProvider.OPENAI
            
        except Exception as e:
            self._update_stats(False)
            self.circuit_breaker.on_failure()
            logger.error(f"Failed to enhance prompt with OpenAI: {str(e)}")
            raise e
    
    async def _enhance_with_openai(self, prompt: str, target_model: str) -> str:
        """Enhance prompt using OpenAI API."""
        headers = {
            "Authorization": f"Bearer {config.settings.openai_api_key}",
            "Content-Type": "application/json"
        }
        
        system_prompt = ModelSpecificPrompts.get_system_prompt(target_model)
        
        data = {
            "model": "gpt-5-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1000,
            "temperature": 0.3
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=aiohttp.ClientTimeout(total=45)
            ) as response:
                if response.status != 200:
                    body = await response.text()
                    raise Exception(f"OpenAI API error: {response.status} - {body}")
                
                result = await response.json()
                return result["choices"][0]["message"]["content"]
    
    def _update_stats(self, success: bool, response_time: float = 0):
        """Update provider statistics."""
        self.stats["requests"] += 1
        
        if success:
            self.stats["successes"] += 1
            if self.stats["avg_response_time"] == 0:
                self.stats["avg_response_time"] = response_time
            else:
                self.stats["avg_response_time"] = (self.stats["avg_response_time"] + response_time) / 2
        else:
            self.stats["failures"] += 1
    
    def is_healthy(self) -> bool:
        """Simple health check for the AI service."""
        return bool(config.settings.openai_api_key) and self.circuit_breaker.state != CircuitBreakerState.OPEN

# Global AI service instance
ai_service = AIService() 
