"""
Request models for the PromptGrammerly API
"""

from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class LLMModel(str, Enum):
    """Supported LLM models"""
    # GPT Models
    GPT_4O = "gpt-4o"
    GPT_4O_MINI = "gpt-4o-mini"
    GPT_4 = "gpt-4"
    GPT_3_5_TURBO = "gpt-3.5-turbo"
    
    # Claude Models
    CLAUDE_3_5_SONNET = "claude-3-5-sonnet"
    CLAUDE_3_OPUS = "claude-3-opus"
    CLAUDE_3_SONNET = "claude-3-sonnet"
    CLAUDE_3_HAIKU = "claude-3-haiku"
    
    # Gemini Models
    GEMINI_1_0_PRO = "gemini-1.0-pro"
    GEMINI_1_5_PRO = "gemini-1.5-pro"
    GEMINI_1_5_FLASH = "gemini-1.5-flash"
    
    # Perplexity Models
    PERPLEXITY_PRO = "perplexity-pro"
    PERPLEXITY_SONAR = "perplexity-sonar"
    
    # Meta AI Models
    META_AI = "meta-ai"
    META_LLAMA_2 = "meta-llama-2"
    META_LLAMA_3 = "meta-llama-3"

class EnhanceRequest(BaseModel):
    """Request model for prompt enhancement"""
    prompt: str = Field(..., description="The prompt to enhance", min_length=1, max_length=2000)
    target_model: Optional[LLMModel] = Field(default=LLMModel.GPT_4O_MINI, description="Target AI model for enhancement")
    context: Optional[str] = Field(default=None, description="Additional context for enhancement")
    fast_mode: Optional[bool] = Field(default=False, description="Skip database operations for faster response")
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "help me write code",
                "target_model": "gpt-4o-mini",
                "context": "I'm building a web application",
                "fast_mode": False
            }
        }

class AnalyzeRequest(BaseModel):
    """Request model for prompt analysis"""
    prompt: str = Field(..., description="The prompt to analyze", min_length=1, max_length=2000)
    include_suggestions: Optional[bool] = Field(default=True, description="Include improvement suggestions")
    
    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "help me write code",
                "include_suggestions": True
            }
        }

class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(default_factory=dict, description="Message data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "enhance",
                "data": {
                    "prompt": "help me write code",
                    "target_model": "gpt-4o-mini"
                }
            }
        } 