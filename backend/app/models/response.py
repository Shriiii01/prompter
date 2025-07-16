from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Optional, Literal
from datetime import datetime

class PromptIssue(BaseModel):
    type: str  # "length", "clarity", "structure", "specificity"
    severity: Literal["low", "medium", "high"]
    description: str
    suggestion: str

class PromptAnalysis(BaseModel):
    overall_score: float  # 0-100
    length_score: float
    clarity_score: float
    specificity_score: float
    structure_score: float
    issues: List[PromptIssue]
    word_count: int
    estimated_tokens: int

class EnhancementResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    original: str
    enhanced: str
    model_used: str
    improvements: List[str]
    analysis: PromptAnalysis
    enhancement_time: float
    cached: bool = False
    timestamp: datetime

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    code: str