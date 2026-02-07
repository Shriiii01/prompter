from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # OpenAI API Key (GPT-5 Mini)
    openai_api_key: Optional[str] = None
    
    # Supabase Database
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

class ConfigManager:
    """Configuration manager."""
    
    def __init__(self):
        self.settings = Settings()

# Global configuration instance
config = ConfigManager()
