import os
import logging
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import validator
from dotenv import load_dotenv, find_dotenv

# Load environment variables from nearest .env up the tree
try:
    dotenv_path = find_dotenv()
    if dotenv_path:
        load_dotenv(dotenv_path=dotenv_path, override=False)
    else:
        load_dotenv()
except Exception:
    # Fallback silently if dotenv loading fails
    pass

logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    """Application settings with validation."""
    
    # Environment
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"
    
    # Application
    app_name: str = "AI Magic Prompt Enhancer"
    app_version: str = "2.0.4"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    
    # API Keys for Three-Tier Fallback System
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    together_api_key: Optional[str] = None
    
    # Database Configuration
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    
    # Payment Configuration (Razorpay)
    razorpay_key_id: Optional[str] = None
    razorpay_secret_key: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None
    
    # Rate Limiting
    rate_limit_per_minute: int = 120
    rate_limit_per_hour: int = 2000
    
    # Circuit Breaker
    circuit_breaker_failure_threshold: int = 5
    circuit_breaker_recovery_timeout: int = 60
    
    # Health Check
    health_check_interval: int = 30
    health_check_timeout: int = 10
    
    # Monitoring
    enable_metrics: bool = True
    metrics_port: int = 9090
    
    @validator('openai_api_key')
    def validate_openai_key(cls, v):
        if not v or v == "your_openai_api_key_here":
            logger.warning("OpenAI API key not configured")
        return v
    
    @validator('gemini_api_key')
    def validate_gemini_key(cls, v):
        if not v or v == "your_gemini_api_key_here":
            logger.warning("Gemini API key not configured")
        return v
    
    @validator('together_api_key')
    def validate_together_key(cls, v):
        if not v or v == "your_together_api_key_here":
            logger.warning("Together API key not configured")
        return v
    
    @validator('supabase_url')
    def validate_supabase_url(cls, v):
        if not v or v == "your_supabase_url_here":
            logger.warning("Supabase URL not configured")
        return v
    
    @validator('supabase_service_key')
    def validate_supabase_key(cls, v):
        if not v or v == "your_supabase_service_key_here":
            logger.warning("Supabase service key not configured")
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False

class ConfigManager:
    """Configuration manager with validation and health checks."""
    
    def __init__(self):
        self.settings = Settings()
        self._validate_configuration()
    
    def _validate_configuration(self):
        """Validate critical configuration on startup."""
        logger.info("Validating configuration...")
        
        # Check if at least one AI provider is configured
        ai_providers = [
            self.settings.openai_api_key,
            self.settings.gemini_api_key,
            self.settings.together_api_key
        ]
        
        if not any(provider and provider != f"your_{provider_name}_api_key_here" 
                  for provider, provider_name in zip(ai_providers, ['openai', 'gemini', 'together'])):
            logger.warning("No AI provider API keys configured - service will work in fallback mode")
        
        # Check database configuration
        if not self.settings.supabase_url or self.settings.supabase_url == "your_supabase_url_here":
            logger.warning("Database not configured - some features may not work")
        
        logger.info("Configuration validation completed")
    
    def get_ai_providers_status(self) -> dict:
        """Get status of all AI providers."""
        return {
            "openai": {
                "configured": bool(self.settings.openai_api_key and 
                                 self.settings.openai_api_key != "your_openai_api_key_here"),
                "key_length": len(self.settings.openai_api_key) if self.settings.openai_api_key else 0
            },
            "gemini": {
                "configured": bool(self.settings.gemini_api_key and 
                                 self.settings.gemini_api_key != "your_gemini_api_key_here"),
                "key_length": len(self.settings.gemini_api_key) if self.settings.gemini_api_key else 0
            },
            "together": {
                "configured": bool(self.settings.together_api_key and 
                                 self.settings.together_api_key != "your_together_api_key_here"),
                "key_length": len(self.settings.together_api_key) if self.settings.together_api_key else 0
            }
        }
    
    def get_database_status(self) -> dict:
        """Get database configuration status."""
        return {
            "configured": bool(self.settings.supabase_url and 
                             self.settings.supabase_url != "your_supabase_url_here"),
            "url_configured": bool(self.settings.supabase_url and 
                                 self.settings.supabase_url != "your_supabase_url_here"),
            "key_configured": bool(self.settings.supabase_service_key and 
                                 self.settings.supabase_service_key != "your_supabase_service_key_here")
        }
    
    def get_system_health(self) -> dict:
        """Get overall system health status."""
        ai_status = self.get_ai_providers_status()
        db_status = self.get_database_status()
        
        return {
            "ai_providers": ai_status,
            "database": db_status,
            "environment": self.settings.environment,
            "debug": self.settings.debug,
            "version": self.settings.app_version
        }

# Global configuration instance
config = ConfigManager() 