import logging
from typing import Dict, Optional
from enum import Enum

from app.services.openai import OpenAIService
from app.services.gemini import GeminiService
from app.core.config import config

logger = logging.getLogger(__name__)

class ProviderType(Enum):
    """Available AI providers"""
    OPENAI = "openai"
    GEMINI = "gemini"
    TOGETHER = "together"

class ProviderManager:
    """
    Manages AI provider initialization and availability
    """
    
    def __init__(self, openai_key: Optional[str] = None, gemini_key: Optional[str] = None, together_key: Optional[str] = None):
        self.providers = {}
        self.api_keys = {
            ProviderType.OPENAI: openai_key or config.settings.openai_api_key,
            ProviderType.GEMINI: gemini_key or config.settings.gemini_api_key,
            ProviderType.TOGETHER: together_key or config.settings.together_api_key
        }
        
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available providers"""
        # OpenAI
        if self.api_keys[ProviderType.OPENAI]:
            self.providers[ProviderType.OPENAI] = OpenAIService(self.api_keys[ProviderType.OPENAI])
            logger.info("✅ OpenAI provider initialized")
        else:
            logger.warning("⚠️ OpenAI API key not configured")
        
        # Gemini
        if self.api_keys[ProviderType.GEMINI]:
            self.providers[ProviderType.GEMINI] = GeminiService(self.api_keys[ProviderType.GEMINI])
            logger.info("✅ Gemini provider initialized")
        else:
            logger.warning("⚠️ Gemini API key not configured")
        
        # Together API (will be implemented inline)
        if self.api_keys[ProviderType.TOGETHER]:
            logger.info("✅ Together API provider configured")
        else:
            logger.warning("⚠️ Together API key not configured")
    
    def is_provider_available(self, provider_type: ProviderType) -> bool:
        """Check if a provider is available"""
        if provider_type == ProviderType.OPENAI:
            return ProviderType.OPENAI in self.providers
        elif provider_type == ProviderType.GEMINI:
            return ProviderType.GEMINI in self.providers
        elif provider_type == ProviderType.TOGETHER:
            return self.api_keys[ProviderType.TOGETHER] is not None
        return False
    
    def get_provider(self, provider_type: ProviderType):
        """Get a specific provider instance"""
        return self.providers.get(provider_type)
    
    def get_together_api_key(self) -> Optional[str]:
        """Get Together API key"""
        return self.api_keys[ProviderType.TOGETHER]
    
    def get_available_providers(self) -> list:
        """Get list of available provider types"""
        return [provider for provider in ProviderType if self.is_provider_available(provider)]
    
    def get_provider_count(self) -> int:
        """Get count of available providers"""
        return len(self.get_available_providers()) 