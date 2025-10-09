import logging
import time
from typing import Optional, Dict, Any

from app.services.circuit_breaker import CircuitBreakerManager
from app.services.provider_manager import ProviderManager, ProviderType
from app.services.stats_tracker import StatsTracker
from app.services.enhancement_engine import EnhancementEngine

logger = logging.getLogger(__name__)

class MultiProviderService:
    """
    Multi-provider service with 3-layer fallback system:
    OpenAI → Gemini → Together API
    
    Features:
    - Circuit breaker pattern for each provider
    - Timeout management
    - Automatic fallback on failures
    - Provider-specific error handling
    - Performance monitoring
    """
    
    def __init__(self, openai_key: Optional[str] = None, gemini_key: Optional[str] = None, together_key: Optional[str] = None):
        # Initialize provider manager
        self.provider_manager = ProviderManager(openai_key, gemini_key, together_key)
        
        # Get available providers for initialization
        available_providers = [provider.value for provider in self.provider_manager.get_available_providers()]
        
        # Initialize circuit breaker manager
        self.circuit_breaker_manager = CircuitBreakerManager(available_providers)
        
        # Initialize stats tracker
        self.stats_tracker = StatsTracker(available_providers)
        
        # Initialize enhancement engine
        self.enhancement_engine = EnhancementEngine(self.provider_manager.get_together_api_key())
        
        # Define fallback order - Gemini first for enhancements
        self.fallback_order = [ProviderType.OPENAI, ProviderType.GEMINI, ProviderType.TOGETHER]
        
        logger.info(" MultiProviderService initialized with 3-layer fallback system")
    
    async def enhance_prompt(self, prompt: str, target_model: str) -> str:
        """
        Enhance prompt using the 3-layer fallback system
        
        Args:
            prompt: The original prompt to enhance
            target_model: The target model for enhancement
            
        Returns:
            Enhanced prompt string
        """
        start_time = time.time()
        logger.info(f" Starting prompt enhancement for model: {target_model}")
        
        # Try each provider in fallback order
        for provider_type in self.fallback_order:
            provider_name = provider_type.value
            
            if not self.provider_manager.is_provider_available(provider_type):
                logger.warning(f" Provider {provider_name} not available, skipping")
                continue
            
            if not self.circuit_breaker_manager.is_circuit_closed(provider_name):
                logger.warning(f" Circuit breaker open for {provider_name}, skipping")
                continue
            
            try:
                logger.info(f" Attempting enhancement with {provider_name}")
                enhanced_prompt = await self._enhance_with_provider(provider_type, prompt, target_model)
                
                if enhanced_prompt and enhanced_prompt.strip():
                    self._record_success(provider_name, time.time() - start_time)
                    logger.info(f" Enhancement successful with {provider_name}")
                    return enhanced_prompt
                else:
                    raise Exception("Empty or invalid response")
                    
            except Exception as e:
                self._record_failure(provider_name)
                logger.error(f" {provider_name} enhancement failed: {str(e)}")
                continue
        
        # If all providers fail, return a basic enhancement
        logger.warning(" All providers failed, using fallback enhancement")
        return self.enhancement_engine.create_fallback_enhancement(prompt, target_model)
    
    async def _enhance_with_provider(self, provider_type: ProviderType, prompt: str, target_model: str) -> str:
        """Enhance prompt with a specific provider"""
        provider_name = provider_type.value
        
        if provider_type in [ProviderType.OPENAI, ProviderType.GEMINI]:
            provider_instance = self.provider_manager.get_provider(provider_type)
            if not provider_instance:
                raise Exception(f"Provider {provider_name} not available")
            
            return await self.enhancement_engine.enhance_with_provider(
                provider_name, provider_instance, prompt, target_model
            )
        elif provider_type == ProviderType.TOGETHER:
            return await self.enhancement_engine.enhance_with_provider(
                provider_name, None, prompt, target_model
            )
        else:
            raise Exception(f"Unknown provider type: {provider_type}")
    
    def _record_success(self, provider_name: str, response_time: float):
        """Record successful request for a provider"""
        self.circuit_breaker_manager.record_success(provider_name)
        self.stats_tracker.record_success(provider_name, response_time)
    
    def _record_failure(self, provider_name: str):
        """Record failed request for a provider"""
        self.circuit_breaker_manager.record_failure(provider_name)
        self.stats_tracker.record_failure(provider_name)
    
    def get_provider_stats(self) -> Dict[str, Any]:
        """Get statistics for all providers"""
        stats = {}
        circuit_stats = self.circuit_breaker_manager.get_circuit_stats()
        performance_stats = self.stats_tracker.get_all_stats()
        
        for provider_type in ProviderType:
            provider_name = provider_type.value
            available = self.provider_manager.is_provider_available(provider_type)
            
            stats[provider_name] = {
                'available': available,
                'circuit_state': circuit_stats.get(provider_name, {}).get('state', 'unknown'),
                'failure_count': circuit_stats.get(provider_name, {}).get('failure_count', 0),
                'success_count': circuit_stats.get(provider_name, {}).get('success_count', 0),
                **performance_stats.get(provider_name, {})
            }
        
        return stats
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall health status of the multi-provider service"""
        available_providers = self.provider_manager.get_provider_count()
        closed_circuits = sum(
            1 for provider_type in ProviderType 
            if self.circuit_breaker_manager.is_circuit_closed(provider_type.value)
        )
        
        return {
            'status': 'healthy' if available_providers > 0 else 'unhealthy',
            'available_providers': available_providers,
            'closed_circuits': closed_circuits,
            'provider_stats': self.get_provider_stats(),
            'overall_stats': self.stats_tracker.get_overall_stats()
        } 