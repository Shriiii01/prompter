from fastapi import APIRouter, HTTPException, Depends, Query, Request, Header, status
from fastapi.responses import JSONResponse, StreamingResponse
from app.models.request import EnhanceRequest, AnalyzeRequest, LLMModel
from app.models.response import EnhancementResult, PromptAnalysis, ErrorResponse
from app.core.enhancer import PromptEnhancer
from app.core.analyzer import PromptAnalyzer
from app.core.model_specific_enhancer import ModelSpecificEnhancer
from app.services.ai_service import AIService, ai_service
from app.services.multi_provider import MultiProviderService
from app.utils.auth import get_email_from_token, get_user_info_from_token
from app.utils.database import db_service
from app.core.config import config
import logging
import time
from typing import Optional
import json
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(tags=["enhancement"])

def get_enhancer():
    """Dependency to get MultiProviderService enhancer instance"""
    try:
        logger.info(f" Initializing MultiProviderService enhancer...")
        logger.info(f"🔑 OpenAI API key available: {bool(config.settings.openai_api_key)}")
        logger.info(f"🔑 Gemini API key available: {bool(config.settings.gemini_api_key)}")
        logger.info(f"🔑 Together API key available: {bool(config.settings.together_api_key)}")

        # Initialize MultiProviderService with all available API keys
        multi_provider_service = MultiProviderService(
            openai_key=config.settings.openai_api_key,
            gemini_key=config.settings.gemini_api_key,
            together_key=config.settings.together_api_key
        )
        
        logger.info(" MultiProviderService initialized successfully")
        logger.info(f" MultiProviderService type: {type(multi_provider_service)}")
        
        # Create ModelSpecificEnhancer with MultiProviderService
        logger.info(" Creating ModelSpecificEnhancer with MultiProviderService")
        enhancer = ModelSpecificEnhancer(multi_provider_service=multi_provider_service)
        logger.info(f" ModelSpecificEnhancer created: {type(enhancer)}")
        return enhancer
        
    except Exception as e:
        logger.error(f" Failed to initialize MultiProviderService enhancer: {str(e)}")
        # Return ModelSpecificEnhancer without MultiProviderService - it has its own fallback logic
        logger.info("🔄 Creating ModelSpecificEnhancer without MultiProviderService (will use internal fallback)")
        return ModelSpecificEnhancer()

@router.post("/enhance", response_model=EnhancementResult)
async def enhance_prompt(
    request: EnhanceRequest,
    enhancer: ModelSpecificEnhancer = Depends(get_enhancer)
):
    """
    Enhance a prompt using AI.
    
    Args:
        request: Enhancement request with prompt and optional model
        enhancer: ModelSpecificEnhancer instance
        
    Returns:
        Enhanced prompt result
    """
    try:
        logger.info(f" Enhancement request received: {request.prompt[:50]}...")
        logger.info(f" Target model: {request.target_model}")
        
        
        # Enhance the prompt
        result = await enhancer.enhance(
            prompt=request.prompt,
            target_model=request.target_model
        )
        
        logger.info(f" Enhancement completed successfully")
        return result
        
    except Exception as e:
        logger.error(f" Enhancement failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Enhancement failed: {str(e)}"
        )

@router.post("/enhance/stream")
async def enhance_prompt_stream(
    request: EnhanceRequest,
    user_email: str = Header(None, alias="X-User-Email"),
    enhancer: ModelSpecificEnhancer = Depends(get_enhancer)
):
    """
    Stream enhanced prompt word by word.
    
    Args:
        request: Enhancement request with prompt and optional model
        user_email: User email from header
        enhancer: ModelSpecificEnhancer instance
        
    Returns:
        Server-Sent Events stream of enhanced prompt
    """
    try:
        logger.info(f" P BUTTON API CALL - Backend received enhancement request")
        logger.info(f" P BUTTON - Prompt: {request.prompt[:50]}...")
        logger.info(f" P BUTTON - User email: {user_email}")
        logger.info(f" P BUTTON - Target model: {request.target_model}")
        logger.info(f" P BUTTON - Prompt length: {len(request.prompt)} characters")
        
        # Check user limits BEFORE processing (CRITICAL FIX)
        if user_email:
            try:
                # Check current user status WITHOUT incrementing count
                user_status = await db_service.check_user_subscription_status(user_email)
                daily_used = user_status.get('daily_prompts_used', 0)
                daily_limit = user_status.get('daily_limit', 10)
                user_tier = user_status.get('subscription_tier', 'free')
                
                # Check if user has reached daily limit
                if user_tier == 'free' and daily_used >= daily_limit:
                    logger.warning(f" User {user_email} has reached daily limit: {daily_used}/{daily_limit}")
                    
                    # Send limit_reached as streaming response WITHOUT making API calls
                    async def limit_reached_stream():
                        yield f"data: {json.dumps({'type': 'limit_reached', 'data': {'daily_prompts_used': daily_used, 'daily_limit': daily_limit, 'subscription_tier': user_tier}})}\n\n"
                        yield f"data: [DONE]\n\n"
                    
                    return StreamingResponse(
                        limit_reached_stream(),
                        media_type="text/plain",
                        headers={
                            "Cache-Control": "no-cache",
                            "Connection": "keep-alive",
                            "X-Accel-Buffering": "no"
                        }
                    )
                
                logger.info(f" User {user_email} has {daily_limit - daily_used} prompts remaining")
                
            except Exception as e:
                logger.error(f" Failed to check user limits: {e} - BLOCKING for safety")
                # BLOCK the request when limit check fails - better safe than sorry
                async def error_limit_stream():
                    yield f"data: {json.dumps({'type': 'limit_reached', 'data': {'daily_prompts_used': 10, 'daily_limit': 10, 'subscription_tier': 'free'}})}\n\n"
                    yield f"data: [DONE]\n\n"
                
                return StreamingResponse(
                    error_limit_stream(),
                    media_type="text/plain",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "X-Accel-Buffering": "no"
                    }
                )
        
        # Stream the enhancement
        async def generate_stream():
            try:
                # Get the enhancement result
                result = await enhancer.enhance(
                    prompt=request.prompt,
                    target_model=request.target_model
                )
                
                # Send the result as a single chunk
                if result and result.enhanced_prompt:
                    yield f"data: {json.dumps({'type': 'chunk', 'data': result.enhanced_prompt})}\n\n"
                
                # Send completion signal
                yield f"data: {json.dumps({'type': 'complete', 'data': ''})}\n\n"
                
                # Count increment removed - only Insert button increments count now
                
            except Exception as e:
                logger.error(f" Streaming error: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )
        
    except Exception as e:
        logger.error(f" Stream enhancement failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Stream enhancement failed: {str(e)}"
        )

@router.post("/analyze", response_model=PromptAnalysis)
async def analyze_prompt(
    request: AnalyzeRequest,
    analyzer: PromptAnalyzer = Depends(lambda: PromptAnalyzer())
):
    """
    Analyze a prompt for quality and suggestions.
    
    Args:
        request: Analysis request with prompt
        analyzer: PromptAnalyzer instance
        
    Returns:
        Prompt analysis result
    """
    try:
        logger.info(f" Analysis request received: {request.prompt[:50]}...")
        
        # Analyze the prompt
        result = await analyzer.analyze_prompt(request.prompt)
        
        logger.info(f" Analysis completed successfully")
        return result
        
    except Exception as e:
        logger.error(f" Analysis failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    Health check endpoint for the enhancement service.
    
    Returns:
        Service health status
    """
    try:
        # Test database connection
        db_healthy = await db_service.health_check()
        
        # Test AI service
        ai_healthy = ai_service.is_healthy()
        
        return {
            "status": "healthy" if db_healthy and ai_healthy else "unhealthy",
            "database": "healthy" if db_healthy else "unhealthy",
            "ai_service": "healthy" if ai_healthy else "unhealthy",
            "timestamp": time.time()
        }
        
    except Exception as e:
        logger.error(f" Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }
