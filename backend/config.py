from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Keys
    together_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # Supabase Database
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    
    # Database Circuit Breaker Configuration
    db_failure_threshold: int = 5
    db_timeout_duration: int = 60
    db_success_threshold: int = 3
    
    # Database Connection Pool Configuration
    db_min_connections: int = 5
    db_max_connections: int = 20
    db_connection_timeout: int = 30
    db_command_timeout: int = 30
    
    # Database Health Check Configuration
    db_health_check_interval: int = 300  # 5 minutes
    
    # App settings
    version: str = "1.0.0"
    debug: bool = False
    
    class Config:
        env_file = ".env"

settings = Settings()