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
import time
from app.utils.database import db_service
from app.core.config import config
import logging
from typing import Optional
import json
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(tags=["enhancement"])  # No prefix here, will be added in main.py

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

def get_analyzer():
    """Dependency to get analyzer instance"""
    return PromptAnalyzer()

def get_current_user_email(authorization: str = Header(...)) -> str:
    """Dependency to get current user email from Google token"""
    return get_email_from_token(authorization)

def get_current_user_info(authorization: str = Header(...)) -> dict:
    """Dependency to get current user info from Google token"""
    return get_user_info_from_token(authorization)

def detect_model_from_url(url: str) -> LLMModel:
    """Auto-detect target model from URL - optimized with dict lookup"""
    if not url:
        return LLMModel.GPT_4O_MINI
    
    hostname = url.lower()
    
    #  OPTIMIZED: Single dict lookup instead of multiple if/elif
    domain_mapping = {
        'openai.com': LLMModel.GPT_4O_MINI,
        'chatgpt.com': LLMModel.GPT_4O_MINI,
        'chat.openai.com': LLMModel.GPT_4O_MINI,
        'claude.ai': LLMModel.CLAUDE_3_5_SONNET,
        'gemini.google.com': LLMModel.GEMINI_1_5_PRO,
        'perplexity.ai': LLMModel.PERPLEXITY_PRO,
        'meta.ai': LLMModel.META_LLAMA_3,
    }
    
    # Fast lookup - returns default if not found
    return next((model for domain, model in domain_mapping.items() if domain in hostname), LLMModel.GPT_4O_MINI)

@router.post("/enhance", response_model=EnhancementResult)
async def enhance_prompt(
    request: EnhanceRequest,
    user_email: str = Depends(get_current_user_email),
    user_info: dict = Depends(get_current_user_info),
    enhancer: ModelSpecificEnhancer = Depends(get_enhancer),
    client_request: Request = None,
    fast_mode: bool = Query(default=False, description="Skip database operations for faster response")
):
    """Enhance a prompt - automatically detects target model and uses appropriate system prompts"""
    start_time = time.time()
    
    # Input validation
    if not request.prompt or len(request.prompt.strip()) < 3:
        raise HTTPException(
            status_code=400, 
            detail="Prompt must be at least 3 characters long"
        )
    
    if len(request.prompt) > 4000:
        raise HTTPException(
            status_code=400, 
            detail="Prompt too long. Maximum 4,000 characters allowed"
        )
    
    try:
        #  User authentication verified - now you have the user's email and info
        if not fast_mode:
            logger.info(f"Verified user: {user_email} (Name: {user_info.get('name', 'Unknown')})")
        
        #  Track user in database (ALWAYS CREATE FOR UI)
        try:
            user_record = await db_service.get_or_create_user(email=user_email, user_info=user_info)
            if not fast_mode:
                logger.info(f"User tracked in database: {user_email} (ID: {user_record['id']})")
        except Exception as e:
            if not fast_mode:
                logger.error(f"Failed to track user in database: {e}")
        
        # 🆓 No usage limits - unlimited access for all users
        if not fast_mode:
            logger.info(f"User {user_email} - unlimited access (no limits)")
        
        # Auto-detect target model from URL/context
        referer = client_request.headers.get('referer', '') if client_request else ''
        url_to_check = request.url or referer
        detected_model = detect_model_from_url(url_to_check)
        
        # Override with request target_model if provided, otherwise use detected
        target_model = request.target_model if request.target_model else detected_model
        
        # Log request for monitoring (REDUCED IN FAST MODE)
        if not fast_mode:
            client_ip = getattr(client_request, 'client', {}).host if client_request else 'unknown'
            logger.info(f"Enhancement request from {client_ip} (User: {user_email}): {request.prompt[:50]}...")
            logger.info(f"Auto-detected model: {detected_model.value} from URL: {url_to_check}")
            logger.info(f"Using target model: {target_model.value} (enhanced by GPT-4o mini with model-specific prompts)")
        
        result = await enhancer.enhance(
            prompt=request.prompt,
            target_model=target_model,
            context=request.context
        )
        
        # Log successful response (REDUCED IN FAST MODE)
        processing_time = time.time() - start_time
        if not fast_mode:
            logger.info(f"Enhancement completed in {processing_time:.2f}s for {client_ip}")
        
        #  Track successful enhancement in database (ALWAYS TRACK FOR UI)
        try:
            # Increment user's prompt count (always track for popup UI)
            new_count = await db_service.increment_user_prompts(email=user_email)
            logger.info(f" User stats updated: {user_email} -> {new_count} prompts")
            
        except Exception as e:
            logger.error(f" Failed to track enhancement in database: {e}")
            # Don't fail the request, just log the error
        
        return result
        
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Enhancement failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Enhancement service temporarily unavailable. Please try again."
        )

@router.post("/analyze", response_model=PromptAnalysis)
async def analyze_prompt(
    request: AnalyzeRequest,
    analyzer: PromptAnalyzer = Depends(get_analyzer)
):
    """Analyze prompt quality without enhancement"""
    
    # Input validation
    if not request.prompt or len(request.prompt.strip()) < 1:
        raise HTTPException(
            status_code=400, 
            detail="Prompt cannot be empty"
        )
    
    if len(request.prompt) > 4000:
        raise HTTPException(
            status_code=400, 
            detail="Prompt too long. Maximum 4,000 characters allowed"
        )
    
    try:
        result = analyzer.analyze(request.prompt)
        logger.info(f"Analysis completed: score {result.overall_score:.1f}")
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Analysis service temporarily unavailable"
        )

@router.get("/health")
async def health_check():
    """Health check endpoint with detailed service status"""
    try:
        # Test enhancer initialization
        enhancer = get_enhancer()
        
        services_status = {
            "openai": {
                "available": bool(config.settings.openai_api_key),
                "configured": bool(enhancer.multi_provider_service),
                "purpose": "Primary LLM for all enhancements"
            },
            "gpt_4o_mini": {
                "available": bool(config.settings.openai_api_key),
                "configured": bool(enhancer.multi_provider_service),
                "purpose": "GPT-4o-mini for all model-specific enhancements"
            },
            "model_specific_enhancement": {
                "available": True,
                "configured": True,
                "description": "Multi-provider system with model-specific prompts for all target models"
            }
        }
        
        # Check service availability - ModelSpecificEnhancer uses MultiProviderService
        multi_provider_available = bool(enhancer.multi_provider_service)
        
        # Determine health status and strategy
        if multi_provider_available:
            health_status = "healthy"
            strategy = "Multi-provider system (OpenAI → Gemini → Together) with model-specific prompts"
            message = "Multi-provider AI service available for all model enhancements"
        else:
            health_status = "degraded"
            strategy = "Fallback enhancement only"
            message = "No AI providers configured - using fallback enhancement"
        
        return {
            "status": health_status,
            "version": config.settings.app_version,
            "timestamp": time.time(),
            "services": services_status,
            "enhancement_strategy": strategy,
            "message": message
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "version": config.settings.app_version,
                "timestamp": time.time(),
                "error": "Service initialization failed"
            }
        )

@router.get("/pipeline-info")
async def get_pipeline_info(enhancer: ModelSpecificEnhancer = Depends(get_enhancer)):
    """Get information about the unified enhancement pipeline"""
    try:
        return {
            "system": "Unified Model-Specific Enhancer",
            "version": "2.0.0",
            "description": "Uses Gemini 2.5 Pro for all model enhancements with model-specific prompts",
            "enhancement_llm": "gemini/gemini-2.5-pro",
            "supported_models": [
                "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo",
                "claude-3-5-sonnet", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
                "gemini-1.0-pro", "gemini-1.5-flash"
            ],
            "features": [
                "Model-specific system prompts",
                "Unified OpenAI GPT-4o-mini enhancement",
                "Intelligent quality analysis",
                "Comprehensive caching",
                "Target model detection"
            ],
            "strategy": "OpenAI GPT-4o-mini for all enhancements with model-specific prompts"
        }
    except Exception as e:
        logger.error(f"Pipeline info failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to retrieve pipeline information")



@router.post("/quick-test")
async def quick_test(
    request: dict,
    enhancer: ModelSpecificEnhancer = Depends(get_enhancer)
):
    """Quick test endpoint without authentication - now with user tracking"""
    try:
        from app.utils.database import db_service
        
        prompt = request.get('prompt', 'write code')
        url = request.get('url', '')
        user_email = request.get('user_email', None)  # Optional user email for tracking
        
        # Input validation - 4000 character limit
        logger.info(f" Validating prompt length: {len(prompt)} characters")
        
        if not prompt or len(prompt.strip()) < 3:
            logger.warning(f" Prompt too short: {len(prompt)} characters")
            raise HTTPException(
                status_code=400, 
                detail="Prompt must be at least 3 characters long"
            )
        
        if len(prompt) > 4000:
            logger.warning(f" Prompt too long: {len(prompt)} characters")
            raise HTTPException(
                status_code=400, 
                detail="Prompt too long. Maximum 4,000 characters allowed"
            )
        
        logger.info(f" Prompt validation passed: {len(prompt)} characters")
        
        # Auto-detect target model from URL
        detected_model = detect_model_from_url(url)
        
        logger.info(f"Quick test request: {prompt[:50]}... for {detected_model.value}")
        
        result = await enhancer.enhance(
            prompt=prompt,
            target_model=detected_model,
            context=None
        )
        
        #  INCREMENT USER PROMPT COUNT IF EMAIL PROVIDED
        if user_email:
            try:
                logger.info(f" Incrementing prompt count for user: {user_email}")
                new_count = await db_service.increment_user_prompts(user_email)
                logger.info(f" Prompt count incremented to: {new_count}")
                
                # Add response fields to indicate count was incremented
                response_data = {
                    "success": True,
                    "original": result.original,
                    "enhanced": result.enhanced,
                    "model_used": result.model_name,
                    "processing_time": result.enhancement_time,
                    "count_incremented": True,
                    "new_count": new_count
                }
            except Exception as db_error:
                logger.warning(f" Failed to increment prompt count: {db_error}")
                response_data = {
                    "success": True,
                    "original": result.original,
                    "enhanced": result.enhanced,
                    "model_used": result.model_name,
                    "processing_time": result.enhancement_time,
                    "count_incremented": False
                }
        else:
            logger.info(" No user email provided - prompt count not incremented")
            response_data = {
                "success": True,
                "original": result.original,
                "enhanced": result.enhanced,
                "model_used": result.model_name,
                "processing_time": result.enhancement_time,
                "count_incremented": False
            }
        
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quick test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/debug/database-version")
async def get_database_version():
    """Debug endpoint to check which database code version is running."""
    try:
        from app.utils.database import db_service
        
        # Test the new direct method
        test_result = await db_service._increment_user_prompts_direct("test@debug.com")
        
        return {
            "status": "success",
            "message": "New database code is running",
            "test_result": test_result,
            "timestamp": time.time()
        }
    except Exception as e:
        return {
            "status": "error", 
            "message": f"Database error: {str(e)}",
            "timestamp": time.time()
        }

@router.get("/models")
async def get_available_models():
    """Get list of available models and their unified enhancement status"""
    
    enhancer = get_enhancer()
    is_openai_available = bool(enhancer.multi_provider_service and hasattr(enhancer.multi_provider_service, 'providers'))
    
    models = {
        "gpt-4o": {
            "name": "GPT-4o",
            "provider": "OpenAI",
            "available": is_openai_available,
            "description": "Most capable OpenAI model",
            "recommended_for": ["complex prompts", "best quality"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "gpt-4o-mini": {
            "name": "GPT-4o Mini",
            "provider": "OpenAI",
            "available": is_openai_available,
            "description": "Fast and cost-effective",
            "recommended_for": ["quick enhancements", "high volume"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "gpt-4": {
            "name": "GPT-4",
            "provider": "OpenAI", 
            "available": is_openai_available,
            "description": "Highest quality reasoning",
            "recommended_for": ["complex prompts", "best quality"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "gpt-5-mini": {
            "name": "GPT-5 Mini",
            "provider": "OpenAI",
            "available": is_openai_available,
            "description": "Latest OpenAI mini model with improved capabilities",
            "recommended_for": ["cost-effective enhancements", "low latency", "high volume"],
            "enhancement_llm": "gpt-5-mini"
        },
        "claude-3-5-sonnet": {
            "name": "Claude 3.5 Sonnet",
            "provider": "Anthropic",
            "available": is_openai_available,
            "description": "Balanced performance and quality",
            "recommended_for": ["general purpose", "creative tasks"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "claude-3-opus": {
            "name": "Claude 3 Opus",
            "provider": "Anthropic",
            "available": is_openai_available,
            "description": "Most capable Claude model",
            "recommended_for": ["complex analysis", "creative writing"],
            "enhancement_llm": "gemini-2.5-pro"
                },
        "gemini-1.0-pro": {
            "name": "Gemini 1.0 Pro",
            "provider": "Google",
            "available": is_openai_available,
            "description": "Original Gemini Pro model",
            "recommended_for": ["general tasks", "conversation", "content creation"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "gemini-1.5-flash": {
            "name": "Gemini 1.5 Flash",
            "provider": "Google",
            "available": is_openai_available,
            "description": "Fast and efficient model",
            "recommended_for": ["quick responses", "general tasks"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "perplexity": {
            "name": "Perplexity",
            "provider": "Perplexity AI",
            "available": is_openai_available,
            "description": "Research-focused AI with source citation",
            "recommended_for": ["research queries", "fact-checking", "comprehensive analysis"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "perplexity-pro": {
            "name": "Perplexity Pro",
            "provider": "Perplexity AI",
            "available": is_openai_available,
            "description": "Advanced research AI with enhanced capabilities",
            "recommended_for": ["complex research", "academic queries", "professional analysis"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "perplexity-sonar": {
            "name": "Perplexity Sonar",
            "provider": "Perplexity AI", 
            "available": is_openai_available,
            "description": "Real-time search and analysis",
            "recommended_for": ["current events", "real-time information", "trending topics"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "meta-ai": {
            "name": "Meta AI",
            "provider": "Meta",
            "available": is_openai_available,
            "description": "Intelligent, conversational AI with helpful and natural responses",
            "recommended_for": ["helpful conversations", "practical advice", "general assistance"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "meta-llama-2": {
            "name": "Meta Llama 2",
            "provider": "Meta",
            "available": is_openai_available,
            "description": "Second generation Llama with improved conversational abilities",
            "recommended_for": ["dialogue", "content creation", "reasoning tasks"],
            "enhancement_llm": "gemini-2.5-pro"
        },
        "meta-llama-3": {
            "name": "Meta Llama 3",
            "provider": "Meta",
            "available": is_openai_available,
            "description": "Latest Llama model with advanced reasoning and helpful responses",
            "recommended_for": ["complex reasoning", "helpful assistance", "natural conversations"],
            "enhancement_llm": "gemini-2.5-pro"
        }
    }
    
    return {
        "models": models,
        "total_available": sum(1 for model in models.values() if model["available"]),
        "enhancement_strategy": "All models use Gemini 2.5 Pro for enhancement with model-specific prompts",
        "recommendation": "gemini-2.5-pro" if is_openai_available else None,
        "unified_enhancement": {
            "enabled": True,
            "enhancement_llm": "gemini-2.5-pro",
            "description": "Single LLM enhances prompts for all target models using model-specific system prompts"
        }
    }



@router.get("/stats")
async def get_service_stats(enhancer: PromptEnhancer = Depends(get_enhancer)):
    """Get service statistics"""
    try:
        # Get global stats from database
        global_stats = await db_service.get_global_stats()
        
        return {
            "service": "PromptGrammarly",
                            "version": config.settings.app_version,
            "status": "operational",
            "enhancement_engine": "GPT-4o mini with model-specific prompts",
            "supported_models": [
                "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo",
                "claude-3-5-sonnet", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
                "gemini-1.0-pro", "gemini-1.5-flash"
            ],
            "features": [
                "Model-specific prompt optimization",
                "Unified GPT-4o mini enhancement",
                "Intelligent quality analysis",
                "Comprehensive caching system",
                "Real-time model detection"
            ],
            "analytics": global_stats
        }
    except Exception as e:
        logger.error(f"Stats endpoint failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to retrieve service statistics")

@router.get("/user/stats")
async def get_user_stats(
    user_email: str = Depends(get_current_user_email)
):
    """Get current user's statistics"""
    try:
        stats = await db_service.get_user_stats(email=user_email)
        
        if not stats:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "user": {
                "email": stats["email"],
                "id": stats["id"],
                "name": stats.get("name")
            },
            "usage": {
                "total_prompts": stats["enhanced_prompts"]
            },
            "activity": {
                "member_since": stats["created_at"].isoformat() if stats["created_at"] else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"User stats failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to retrieve user statistics")

@router.get("/user/count/{email}")
async def get_user_count_by_email(email: str):
    """Get user's enhanced prompt count by email (no auth required)"""
    try:
        from app.utils.database import db_service
        
        # Get user stats directly
        stats = await db_service.get_user_stats(email=email)
        
        if stats:
            # User exists, return their stats
            logger.info(f" User found: {email} with {stats['enhanced_prompts']} prompts")
            return {
                "count": stats["enhanced_prompts"],
                "email": email,
                "name": stats.get("name"),
                "new_user": False
            }
        else:
            # User doesn't exist, return 0
            logger.info(f" User not found: {email}")
            return {
                "count": 0,
                "email": email,
                "name": email.split('@')[0],
                "new_user": False
            }
        
    except Exception as e:
        logger.error(f"User count failed for {email}: {str(e)}")
        return {"count": 0, "email": email, "error": str(e)}

@router.get("/user/leaderboard")
async def get_leaderboard(
    limit: int = Query(default=10, ge=1, le=50, description="Number of top users to return")
):
    """Get leaderboard of top users by prompt count"""
    try:
        conn = await db_service.get_connection()
        try:
            top_users = await conn.fetch("""
                SELECT 
                    email, enhanced_prompts
                FROM users 
                WHERE enhanced_prompts > 0
                ORDER BY enhanced_prompts DESC 
                LIMIT $1
            """, limit)
            
            return {
                "leaderboard": [
                    {
                        "email": user["email"],
                        "prompts": user["enhanced_prompts"]
                    }
                    for user in top_users
                ]
            }
            
        finally:
            await db_service.connection_pool.release(conn)
            
    except Exception as e:
        logger.error(f"Leaderboard failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Unable to retrieve leaderboard")

@router.post("/user/update-name")
async def update_user_name(
    request: dict,
    user_email: str = Depends(get_current_user_email)
):
    """Update user's display name in database"""
    try:
        name = request.get("name")
        if not name or not name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        
        # Update name in database
        db_service._init_supabase()
        result = db_service.supabase.table('users').update({
            'name': name.strip()
        }).eq('email', user_email).execute()
        
        if result.data:
            logger.info(f"Updated name for {user_email}: {name}")
            return {"success": True, "message": "Name updated successfully"}
        else:
            raise HTTPException(status_code=404, detail="User not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user name: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update name")

@router.post("/stream-enhance")
async def stream_enhance_prompt(request: EnhanceRequest, x_user_id: str = Header(None, alias="X-User-ID")):
    """Stream enhanced prompt in chunks for magical animation using ONLY AI service"""
    try:
        # Handle 'auto' target model - default to Gemini 2.5 Pro
        target_model = request.target_model
        if target_model == 'auto' or not target_model:
            target_model = 'gemini-2.5-pro'
        
        logger.info(f" SIMPLE AI ENHANCEMENT: Starting for prompt: {request.prompt[:50]}...")
        logger.info(f" Target model: {target_model}")
        logger.info(f"📧 User ID received: {x_user_id}")
        logger.info(f" DEBUGGING BACKEND:")
        logger.info(f"  - User ID received: {x_user_id}")
        logger.info(f"  - User ID type: {type(x_user_id)}")
        logger.info(f"  - User ID length: {len(x_user_id) if x_user_id else 0}")
        logger.info(f"  - User ID is empty?: {not x_user_id}")
        logger.info(f"  - User ID repr: {repr(x_user_id)}")
        logger.info(f"  - Headers: X-User-ID={x_user_id}")
        logger.info(f" Available providers: OpenAI={'' if config.settings.openai_api_key and config.settings.openai_api_key != 'your_openai_api_key_here' else ''}, Gemini={'' if config.settings.gemini_api_key and config.settings.gemini_api_key != 'your_gemini_api_key_here' else ''}")

        # Increment user's prompt count (always track for popup UI)
        if x_user_id:
            try:
                logger.info(f" Incrementing prompt count for user: {x_user_id}")
                logger.info(f" ABOUT TO CALL increment_user_prompts with: {x_user_id}")
                new_count = await db_service.increment_user_prompts(x_user_id)
                logger.info(f" Prompt count incremented to: {new_count}")
                logger.info(f" NEW COUNT RETURNED: {new_count}")
            except Exception as db_error:
                logger.warning(f" Failed to increment prompt count: {db_error}")
        else:
            logger.info(" No user email provided - prompt count not incremented")

        # Use REAL streaming from AI service
        try:
            detected_model = "gemini-2.5-pro"
            logger.info(f" Starting REAL streaming with {detected_model}")
            
            async def generate_stream():
                """Generate REAL streaming response from AI"""
                # Removed model metadata - just show enhanced prompt directly
                
                # Send updated count after increment
                if x_user_id:
                    try:
                        current_count = await db_service.get_user_stats(x_user_id)
                        if current_count:
                            yield f"data: {json.dumps({'type': 'count_update', 'data': current_count.get('enhanced_prompts', 0)})}\n\n"
                    except Exception as e:
                        logger.warning(f" Failed to get updated count: {e}")
                
                # Stream the response in real-time as it comes from OpenAI
                current_text = ""
                async for chunk in ai_service._enhance_with_openai_streaming(
                    request.prompt,
                    target_model
                ):
                    current_text += chunk
                    # Send each chunk as it comes
                    yield f"data: {json.dumps({'type': 'chunk', 'data': current_text})}\n\n"
                
                # Send completion
                yield f"data: {json.dumps({'type': 'complete', 'data': current_text})}\n\n"
                yield "data: [DONE]\n\n"
                
        except Exception as ai_error:
            logger.error(f" AI service failed: {ai_error}")
            # If AI service fails, raise the error instead of using fallback
            raise ai_error
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
        
    except Exception as e:
        logger.error(f"Stream enhancement error: {str(e)}")
        
        # Error response - no fallbacks
        async def error_stream():
            yield f"data: {json.dumps({'type': 'error', 'data': f'Enhancement failed: {str(e)}'})}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            error_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )

@router.post("/user/increment-count")
async def increment_user_count(request: dict):
    """Simple endpoint to increment user prompt count without enhancement"""
    try:
        from app.utils.database import db_service
        
        user_email = request.get('user_email')
        if not user_email:
            return {"success": False, "error": "user_email is required"}
        
        # Increment the user's prompt count
        new_count = await db_service.increment_user_prompts(user_email)
        
        logger.info(f" Incremented prompt count for {user_email}: {new_count}")
        
        return {
            "success": True,
            "email": user_email,
            "new_count": new_count
        }
        
    except Exception as e:
        logger.error(f" Failed to increment user count: {e}")
        return {
            "success": False,
            "error": str(e)
        }