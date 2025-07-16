from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum

# Updated to include Perplexity and Meta AI models

class LLMModel(str, Enum):
    GPT4 = "gpt-4"
    GPT4O = "gpt-4o"
    GPT4O_MINI = "gpt-4o-mini"
    GPT35 = "gpt-3.5-turbo"
    CLAUDE_35_SONNET = "claude-3-5-sonnet"
    CLAUDE_3_OPUS = "claude-3-opus"
    CLAUDE_3_SONNET = "claude-3-sonnet"
    CLAUDE_3_HAIKU = "claude-3-haiku"
    GEMINI_PRO = "gemini-pro"
    GEMINI_2_FLASH = "gemini-2.0-flash"
    GEMINI_15_PRO = "gemini-1.5-pro"
    GEMINI_15_FLASH = "gemini-1.5-flash"
    PERPLEXITY = "perplexity"
    PERPLEXITY_PRO = "perplexity-pro"
    PERPLEXITY_SONAR = "perplexity-sonar"
    META_AI = "meta-ai"
    META_LLAMA_2 = "meta-llama-2"
    META_LLAMA_3 = "meta-llama-3"

class EnhanceRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=10000)
    target_model: Optional[LLMModel] = None
    context: Optional[str] = None
    url: Optional[str] = None
    
class AnalyzeRequest(BaseModel):
    prompt: str = Field(..., min_length=1)

class WebSocketMessage(BaseModel):
    type: Literal["enhance", "analyze", "ping"]
    payload: dict
    id: str