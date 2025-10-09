"""
Response models for the PromptGrammerly API
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class PromptIssue(BaseModel):
    """Represents a specific issue with a prompt"""
    issue_type: str = Field(..., description="Type of issue (e.g., 'vague', 'unclear', 'missing_context')")
    severity: str = Field(..., description="Severity level ('low', 'medium', 'high')")
    description: str = Field(..., description="Description of the issue")
    suggestion: str = Field(..., description="Suggestion for improvement")
    
    class Config:
        json_schema_extra = {
            "example": {
                "issue_type": "vague",
                "severity": "medium",
                "description": "The prompt is too general and lacks specific requirements",
                "suggestion": "Add specific requirements and expected output format"
            }
        }

class PromptAnalysis(BaseModel):
    """Analysis results for a prompt"""
    quality_score: float = Field(..., description="Overall quality score (0-100)", ge=0, le=100)
    issues: List[PromptIssue] = Field(default_factory=list, description="List of identified issues")
    strengths: List[str] = Field(default_factory=list, description="List of prompt strengths")
    suggestions: List[str] = Field(default_factory=list, description="List of improvement suggestions")
    word_count: int = Field(..., description="Number of words in the prompt")
    estimated_tokens: int = Field(..., description="Estimated token count")
    
    class Config:
        json_schema_extra = {
            "example": {
                "quality_score": 75.5,
                "issues": [
                    {
                        "issue_type": "vague",
                        "severity": "medium",
                        "description": "The prompt is too general",
                        "suggestion": "Add specific requirements"
                    }
                ],
                "strengths": ["Clear intent", "Good structure"],
                "suggestions": ["Add specific output format", "Include examples"],
                "word_count": 15,
                "estimated_tokens": 25
            }
        }

class EnhancementResult(BaseModel):
    """Result of prompt enhancement"""
    original: str = Field(..., description="Original prompt")
    enhanced: str = Field(..., description="Enhanced prompt")
    model_name: str = Field(..., description="Model used for enhancement")
    improvements: List[str] = Field(default_factory=list, description="List of improvements made")
    analysis: Optional[PromptAnalysis] = Field(default=None, description="Analysis of the original prompt")
    enhancement_time: float = Field(..., description="Time taken for enhancement in seconds")
    cached: bool = Field(default=False, description="Whether result was served from cache")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp of enhancement")
    
    class Config:
        json_schema_extra = {
            "example": {
                "original": "help me write code",
                "enhanced": "Please help me write clean, well-documented code with specific requirements and expected output format.",
                "model_name": "gpt-5",
                "improvements": ["Added specificity", "Included output format"],
                "enhancement_time": 0.5,
                "cached": False,
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }

class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    details: Optional[str] = Field(default=None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp of error")
    
    class Config:
        schema_extra = {
            "example": {
                "error": "Invalid request",
                "details": "Prompt cannot be empty",
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }

class UserStats(BaseModel):
    """User statistics model"""
    email: str = Field(..., description="User email")
    total_prompts: int = Field(..., description="Total number of prompts enhanced")
    last_enhancement: Optional[datetime] = Field(default=None, description="Last enhancement timestamp")
    created_at: datetime = Field(..., description="User creation timestamp")
    
    class Config:
        schema_extra = {
            "example": {
                "email": "user@example.com",
                "total_prompts": 42,
                "last_enhancement": "2024-01-01T12:00:00Z",
                "created_at": "2024-01-01T10:00:00Z"
            }
        }

class HealthResponse(BaseModel):
    """Health check response model"""
    status: str = Field(..., description="Service status")
    timestamp: datetime = Field(default_factory=datetime.now, description="Health check timestamp")
    version: str = Field(..., description="API version")
    uptime: Optional[float] = Field(default=None, description="Service uptime in seconds")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2024-01-01T12:00:00Z",
                "version": "1.0.0",
                "uptime": 3600.5
            }
        } 