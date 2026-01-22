import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import validator
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings with validation."""
    
    # Environment
    environment: str = "development"
    debug: bool = True
    log_level: str = "INFO"
    
    # Application
    app_name: str = "PromptGrammerly"
    app_version: str = "2.0.4"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 4
    
    # API Key for OpenAI GPT-5 Mini
    openai_api_key: Optional[str] = None
    
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
        return v
    
    @validator('supabase_url')
    def validate_supabase_url(cls, v):
        return v
    
    @validator('supabase_service_key')
    def validate_supabase_key(cls, v):
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra fields from .env (legacy API keys)

class ConfigManager:
    """Configuration manager with validation and health checks."""
    
    def __init__(self):
        self.settings = Settings()

# Global configuration instance
config = ConfigManager() 