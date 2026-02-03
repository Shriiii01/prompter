from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import validator
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings with validation."""
    
    # API Key for OpenAI GPT-5 Mini
    openai_api_key: Optional[str] = None
    
    # Database Configuration
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    
    # Payment Configuration (Razorpay)
    razorpay_key_id: Optional[str] = None
    razorpay_secret_key: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None
    
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
        extra = "ignore"  # Ignore extra fields from .env

class ConfigManager:
    """Configuration manager."""
    
    def __init__(self):
        self.settings = Settings()

# Global configuration instance
config = ConfigManager() 