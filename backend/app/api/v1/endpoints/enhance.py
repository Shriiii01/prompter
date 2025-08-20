import logging
import time
from typing import Dict, Optional
import uuid
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from pydantic import BaseModel, validator
import re

from ....services.ai_service import ai_service, AIProvider
from ....services.database import DatabaseService

# Initialize the correct database service
database_service = DatabaseService()
from ....core.config import config

logger = logging.getLogger(__name__)
router = APIRouter(tags=["enhancement-v1"])

def _noop():
    return None

def _local_enhance(original_prompt: str, target_model: str) -> str:
    """Deterministic, offline enhancement to avoid failures propagating to UI.
    Produces a clean rewritten prompt without answering the question.
    """
    original = (original_prompt or "").strip()
    if not original:
        return "Rewrite the prompt with a clear objective, must-have details, and a short example. Output the rewritten prompt only."
    sections = [
        "Rewrite the following prompt to be precise, testable, and easy for an LLM to execute.",
        "Rules:",
        "- Do NOT answer the prompt.",
        "- Keep the original intent.",
        "- Specify expected output format and constraints.",
        "- Include 1 brief example if useful.",
        "Rewritten prompt target model: {}".format(target_model or "auto"),
        "Original prompt:",
        original
    ]
    return "\n".join(sections)

class EnhancementRequest(BaseModel):
    """Request model for prompt enhancement."""
    prompt: str
    target_model: str = "auto"
    user_id: Optional[str] = None
    
    @validator('prompt')
    def validate_prompt(cls, v):
        if not v or not v.strip():
            raise ValueError("Prompt cannot be empty")
        if len(v) > 10000:
            raise ValueError("Prompt too long (max 10,000 characters)")
        return v.strip()
    
    @validator('target_model')
    def validate_target_model(cls, v):
        valid_models = [
            "auto", "chatgpt", "claude", "gemini", "perplexity", "poe",
            "gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo",
            "claude-3-5-sonnet", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
            "gemini-1.0-pro", "gemini-1.5-pro", "gemini-1.5-flash",
            "perplexity-pro", "perplexity-sonar",
            "meta-ai", "meta-llama-2", "meta-llama-3"
        ]
        if v.lower() not in valid_models:
            raise ValueError(f"Invalid target model. Must be one of: {valid_models}")
        return v.lower()

class EnhancementResponse(BaseModel):
    """Response model for prompt enhancement."""
    enhanced_prompt: str
    provider_used: str
    target_model: str
    user_prompt_count: int
    processing_time: float
    success: bool = True

def detect_target_model_from_url(request: Request) -> str:
    """Auto-detect target model from request URL."""
    url = str(request.url)
    
    model_patterns = {
        "chatgpt": ["chat.openai.com", "chatgpt.com"],
        "claude": ["claude.ai"],
        "gemini": ["gemini.google.com"],
        "perplexity": ["perplexity.ai", "www.perplexity.ai"],
        "poe": ["poe.com"]
    }
    
    for model, patterns in model_patterns.items():
        if any(pattern in url for pattern in patterns):
            return model
    
    return "auto"

async def get_user_id_from_headers(request: Request) -> str:
    """Extract user ID from request headers or generate anonymous ID."""
    # Try to get from headers
    user_id = request.headers.get("X-User-ID")
    if user_id:
        return user_id
    
    # Try to get from query parameters
    user_id = request.query_params.get("user_id")
    if user_id:
        return user_id
    
    # Generate anonymous ID based on IP and user agent
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "unknown")
    
    # Simple hash for anonymous user
    import hashlib
    anonymous_id = hashlib.md5(f"{client_ip}:{user_agent}".encode()).hexdigest()[:16]
    return f"anon_{anonymous_id}"

@router.post("/enhance", response_model=EnhancementResponse)
async def enhance_prompt(
    request: EnhancementRequest,
    http_request: Request,
    user_id: str = Depends(get_user_id_from_headers),
    idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
    platform: Optional[str] = Header(None, alias="X-Platform")
):
    """
    Enhance a prompt using the three-tier AI provider system.
    
    Args:
        request: Enhancement request with prompt and target model
        http_request: FastAPI request object for URL detection
        user_id: User identifier (extracted from headers or generated)
    
    Returns:
        Enhanced prompt with metadata
    """
    start_time = time.time()
    
    try:
        # Auto-detect target model if not specified
        if request.target_model == "auto":
            detected_model = detect_target_model_from_url(http_request)
            target_model = detected_model if detected_model != "auto" else "chatgpt"
        else:
            target_model = request.target_model
        
        logger.info(f"Enhancing prompt for user {user_id} with target model: {target_model}")
        
        # Pre-check subscription & daily limit to avoid unnecessary AI calls
        try:
            sub_status = await database_service.check_user_subscription_status(user_id)
            if sub_status and sub_status.get('subscription_tier') == 'free':
                daily_used = sub_status.get('daily_prompts_used', 0)
                daily_limit = sub_status.get('daily_limit', 5)
                if daily_limit is not None and daily_used >= daily_limit:
                    raise HTTPException(status_code=402, detail="Daily limit reached. Please upgrade to Pro.")
        except Exception:
            # On error, proceed to AI but still rely on atomic record step later
            pass

        # Enhance prompt using AI service (with graceful local fallback)
        enhanced_prompt = None
        provider = None
        try:
            enhanced_prompt, provider = await ai_service.enhance_prompt(
                request.prompt,
                target_model
            )
        except Exception as ai_error:
            logger.warning(f"AI enhancement failed, using local fallback: {ai_error}")
            enhanced_prompt = _local_enhance(request.prompt, target_model)
            provider = AIProvider.OPENAI  # nominal tag for UI; actual text is local

        # Normalize platform early so it can be used for counting
        normalized_platform = (platform or '').strip().lower()
        if normalized_platform not in ['chatgpt','claude','gemini','perplexity','meta']:
            # Fallback: try detect from request URL
            detected = detect_target_model_from_url(http_request)
            mapping = {
                'chatgpt': 'chatgpt',
                'claude': 'claude',
                'gemini': 'gemini',
                'perplexity': 'perplexity',
                'poe': 'chatgpt'  # treat poe as chatgpt bucket for now
            }
            normalized_platform = mapping.get(detected, 'chatgpt')

        # Atomically record successful enhancement with idempotency key
        effective_key = idempotency_key or str(uuid.uuid4())
        counters = await database_service.record_enhancement_atomic(user_id, effective_key, platform=normalized_platform)
        user_count = counters.get('enhanced_prompts', 0)

        try:
            await database_service.log_platform_usage(
                email=user_id,
                platform=normalized_platform,
                provider=provider.value if provider else 'local',
                target_model=target_model
            )
        except Exception:
            pass
        
        # Log the enhancement request (if method exists)
        try:
            await database_service.log_enhancement_request(
                user_id=user_id,
                original_prompt=request.prompt,
                enhanced_prompt=enhanced_prompt,
                provider=(provider.value if provider else 'local'),
                target_model=target_model
            )
        except AttributeError:
            logger.info(f"Enhancement logged for user {user_id}")
        
        processing_time = time.time() - start_time
        
        logger.info(f"Successfully enhanced prompt in {processing_time:.2f}s using {provider.value}")
        
        return EnhancementResponse(
            enhanced_prompt=enhanced_prompt,
            provider_used=provider.value,
            target_model=target_model,
            user_prompt_count=user_count,
            processing_time=processing_time
        )
        
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Enhancement failed after {processing_time:.2f}s: {str(e)}")
        
        # Check if it's an AI service issue
        if "No AI providers available" in str(e) or "provider" in str(e).lower():
            raise HTTPException(status_code=503, detail="Enhancement service temporarily unavailable. Please try again.")
        
        # Check if it's an auth issue
        if "auth" in str(e).lower() or "token" in str(e).lower():
            raise HTTPException(status_code=401, detail="Authentication failed. Please sign in again.")
        
        # Generic error
        raise HTTPException(status_code=500, detail="Enhancement failed")

@router.get("/user/{user_id}/count")
async def get_user_count(user_id: str):
    """Get user's prompt enhancement count."""
    try:
        count = await database_service.get_user_count_only(user_id)
        return {"user_id": user_id, "prompt_count": count}
    except Exception as e:
        logger.error(f"Failed to get user count: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get user count")

@router.get("/stats")
async def get_system_stats():
    """Get system-wide statistics."""
    try:
        stats = await database_service.get_system_stats()
        ai_stats = ai_service.get_provider_stats()
        
        return {
            "database": stats,
            "ai_providers": ai_stats,
            "system": {
                "version": config.settings.app_version,
                "environment": config.settings.environment
            }
        }
    except Exception as e:
        logger.error(f"Failed to get system stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get system stats")

@router.get("/health")
async def health_check():
    """Quick health check for the enhancement service."""
    try:
        # Check AI providers
        ai_health = await ai_service.health_check()
        
        # Check database
        db_health = await database_service.health_check()
        
        # Determine overall health
        ai_healthy = any(
            provider.get("status") == "healthy" 
            for provider in ai_health.values()
        )
        
        overall_status = "healthy" if ai_healthy else "degraded"
        
        return {
            "status": overall_status,
            "ai_providers": ai_health,
            "database": db_health,
            "timestamp": time.time()
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }

@router.post("/test-enhance")
async def test_enhance_prompt(request: EnhancementRequest):
    """Test enhancement without authentication (for debugging)."""
    start_time = time.time()
    
    try:
        logger.info(f"Testing enhancement with target model: {request.target_model}")
        
        # Enhance prompt using AI service
        enhanced_prompt, provider = await ai_service.enhance_prompt(
            request.prompt, 
            request.target_model
        )
        
        processing_time = time.time() - start_time
        
        logger.info(f"Successfully enhanced prompt in {processing_time:.2f}s using {provider.value}")
        
        return {
            "enhanced_prompt": enhanced_prompt,
            "provider_used": provider.value,
            "target_model": request.target_model,
            "processing_time": processing_time,
            "success": True
        }
        
    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Test enhancement failed after {processing_time:.2f}s: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}") 