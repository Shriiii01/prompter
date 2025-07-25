from fastapi import APIRouter, HTTPException, Depends, Query, Request, Header, status
from fastapi.responses import JSONResponse, StreamingResponse
from app.models.request import EnhanceRequest, AnalyzeRequest, LLMModel
from app.models.response import EnhancementResult, PromptAnalysis, ErrorResponse
from app.core.enhancer import PromptEnhancer
from app.core.analyzer import PromptAnalyzer
from app.core.model_specific_enhancer import ModelSpecificEnhancer
from app.services.openai import OpenAIService
from app.utils.auth import get_email_from_token, get_user_info_from_token
from app.services.database import db_service
from config import settings
import logging
import time
from typing import Optional
import json
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["enhancement"])

def get_enhancer():
    """Dependency to get OpenAI GPT-4o-mini enhancer instance"""
    try:
        openai_service = None
        
        # Initialize OpenAI service (primary)
        if settings.openai_api_key:
            try:
                openai_service = OpenAIService(settings.openai_api_key)
                logger.info("✅ OpenAI GPT-4o-mini service initialized")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI service: {str(e)}")
        
        # If OpenAI service is not available, use basic fallback
        if not openai_service:
            logger.warning("No OpenAI service available. Using basic fallback enhancement.")
            from app.core.enhancer import PromptEnhancer
            return PromptEnhancer()
            
        return ModelSpecificEnhancer(
            openai_service=openai_service
        )
        
    except Exception as e:
        logger.error(f"Failed to initialize ModelSpecificEnhancer: {str(e)}")
        # Return fallback enhancer
        from app.core.enhancer import PromptEnhancer
        return PromptEnhancer()

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
    """Auto-detect target model from URL"""
    if not url:
        return LLMModel.GPT4O_MINI
    
    hostname = url.lower()
    
    if 'openai.com' in hostname or 'chatgpt.com' in hostname:
        return LLMModel.GPT4O_MINI
    elif 'claude.ai' in hostname:
        return LLMModel.CLAUDE_35_SONNET
    elif 'gemini.google.com' in hostname:
        return LLMModel.GEMINI_15_PRO
    elif 'perplexity.ai' in hostname:
        return LLMModel.PERPLEXITY_PRO
    elif 'meta.ai' in hostname:
        return LLMModel.META_LLAMA_3
    else:
        return LLMModel.GPT4O_MINI

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
    
    if len(request.prompt) > 10000:
        raise HTTPException(
            status_code=400, 
            detail="Prompt too long. Maximum 10,000 characters allowed"
        )
    
    try:
        # ✅ User authentication verified - now you have the user's email and info
        if not fast_mode:
            logger.info(f"Verified user: {user_email} (Name: {user_info.get('name', 'Unknown')})")
        
        # 📊 Track user in database (ALWAYS CREATE FOR UI)
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
        
        # 📊 Track successful enhancement in database (ALWAYS TRACK FOR UI)
        try:
            # Increment user's prompt count (always track for popup UI)
            new_count = await db_service.increment_user_prompts(email=user_email)
            logger.info(f"✅ User stats updated: {user_email} -> {new_count} prompts")
            
        except Exception as e:
            logger.error(f"❌ Failed to track enhancement in database: {e}")
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
    
    if len(request.prompt) > 10000:
        raise HTTPException(
            status_code=400, 
            detail="Prompt too long. Maximum 10,000 characters allowed"
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
                "available": bool(settings.openai_api_key),
                "configured": bool(enhancer.openai_service),
                "purpose": "Primary LLM for all enhancements"
            },
            "gpt_4o_mini": {
                "available": bool(settings.openai_api_key),
                "configured": bool(enhancer.openai_service),
                "purpose": "GPT-4o-mini for all model-specific enhancements"
            },
            "model_specific_enhancement": {
                "available": True,
                "configured": True,
                "description": "GPT-4o-mini with model-specific prompts for all target models"
            }
        }
        
        # Check service availability
        openai_available = services_status["openai"]["available"]
        
        # Determine health status and strategy
        if openai_available:
            health_status = "healthy"
            strategy = "OpenAI GPT-4o-mini for all enhancements with model-specific prompts"
            message = "OpenAI GPT-4o-mini service available for all model enhancements"
        else:
            health_status = "unhealthy"
            strategy = "Basic rule-based enhancement only"
            message = "No OpenAI service available - using basic enhancement"
        
        return {
            "status": health_status,
            "version": settings.version,
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
                "version": settings.version,
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
            "description": "Uses OpenAI GPT-4o-mini for all model enhancements with model-specific prompts",
            "enhancement_llm": "openai/gpt-4o-mini",
            "supported_models": [
                "gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo",
                "claude-3-5-sonnet", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
                "gemini-pro", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"
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

@router.post("/test-enhancement")
async def test_enhancement(
    test_prompt: str = Query(default="Hello, how can I improve this text?", description="Test prompt to enhance"),
    target_model: LLMModel = Query(default=LLMModel.GPT4O_MINI, description="Target model for enhancement"),
    enhancer: ModelSpecificEnhancer = Depends(get_enhancer)
):
    """Test the unified enhancement pipeline with a sample prompt"""
    
    # Rate limiting for test endpoint
    if len(test_prompt) > 500:
        raise HTTPException(
            status_code=400, 
            detail="Test prompts limited to 500 characters"
        )
    
    try:
        result = await enhancer.enhance(
            prompt=test_prompt,
            target_model=target_model
        )
        
        return {
            "test_prompt": test_prompt,
            "target_model": target_model.value,
            "enhancement_llm": "openai/gpt-4o-mini",
            "result": {
                "original": result.original,
                "enhanced": result.enhanced,
                "improvements": result.improvements,
                "model_used": result.model_used,
                "processing_time": result.enhancement_time
            },
            "strategy": f"Used {target_model.value}-specific prompts with OpenAI GPT-4o-mini"
        }
    except Exception as e:
        logger.error(f"Test enhancement failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Test enhancement failed. Please check service configuration."
        )

@router.post("/quick-test")
async def quick_test(
    request: dict,
    enhancer: ModelSpecificEnhancer = Depends(get_enhancer)
):
    """Quick test endpoint without authentication"""
    try:
        prompt = request.get('prompt', 'write code')
        url = request.get('url', '')
        
        # Auto-detect target model from URL
        detected_model = detect_model_from_url(url)
        
        logger.info(f"Quick test request: {prompt[:50]}... for {detected_model.value}")
        
        result = await enhancer.enhance(
            prompt=prompt,
            target_model=detected_model,
            context=None
        )
        
        return {
            "success": True,
            "original": result.original,
            "enhanced": result.enhanced,
            "model_used": result.model_used,
            "processing_time": result.enhancement_time
        }
    except Exception as e:
        logger.error(f"Quick test failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@router.get("/models")
async def get_available_models():
    """Get list of available models and their unified enhancement status"""
    
    enhancer = get_enhancer()
    is_openai_available = bool(enhancer.openai_service)
    
    models = {
        "gpt-4o": {
            "name": "GPT-4o",
            "provider": "OpenAI",
            "available": is_openai_available,
            "description": "Most capable OpenAI model",
            "recommended_for": ["complex prompts", "best quality"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "gpt-4o-mini": {
            "name": "GPT-4o Mini",
            "provider": "OpenAI",
            "available": is_openai_available,
            "description": "Fast and cost-effective",
            "recommended_for": ["quick enhancements", "high volume"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "gpt-4": {
            "name": "GPT-4",
            "provider": "OpenAI", 
            "available": is_openai_available,
            "description": "Highest quality reasoning",
            "recommended_for": ["complex prompts", "best quality"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "claude-3-5-sonnet": {
            "name": "Claude 3.5 Sonnet",
            "provider": "Anthropic",
            "available": is_openai_available,
            "description": "Balanced performance and quality",
            "recommended_for": ["general purpose", "creative tasks"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "claude-3-opus": {
            "name": "Claude 3 Opus",
            "provider": "Anthropic",
            "available": is_openai_available,
            "description": "Most capable Claude model",
            "recommended_for": ["complex analysis", "creative writing"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "gemini-2.0-flash": {
            "name": "Gemini 2.0 Flash",
            "provider": "Google",
            "available": is_openai_available,
            "description": "Fast and versatile",
            "recommended_for": ["multimodal tasks", "quick responses"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "gemini-1.5-pro": {
            "name": "Gemini 1.5 Pro",
            "provider": "Google",
            "available": is_openai_available,
            "description": "Advanced reasoning capabilities",
            "recommended_for": ["complex analysis", "long context"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "perplexity": {
            "name": "Perplexity",
            "provider": "Perplexity AI",
            "available": is_openai_available,
            "description": "Research-focused AI with source citation",
            "recommended_for": ["research queries", "fact-checking", "comprehensive analysis"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "perplexity-pro": {
            "name": "Perplexity Pro",
            "provider": "Perplexity AI",
            "available": is_openai_available,
            "description": "Advanced research AI with enhanced capabilities",
            "recommended_for": ["complex research", "academic queries", "professional analysis"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "perplexity-sonar": {
            "name": "Perplexity Sonar",
            "provider": "Perplexity AI", 
            "available": is_openai_available,
            "description": "Real-time search and analysis",
            "recommended_for": ["current events", "real-time information", "trending topics"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "meta-ai": {
            "name": "Meta AI",
            "provider": "Meta",
            "available": is_openai_available,
            "description": "Intelligent, conversational AI with helpful and natural responses",
            "recommended_for": ["helpful conversations", "practical advice", "general assistance"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "meta-llama-2": {
            "name": "Meta Llama 2",
            "provider": "Meta",
            "available": is_openai_available,
            "description": "Second generation Llama with improved conversational abilities",
            "recommended_for": ["dialogue", "content creation", "reasoning tasks"],
            "enhancement_llm": "gpt-4o-mini"
        },
        "meta-llama-3": {
            "name": "Meta Llama 3",
            "provider": "Meta",
            "available": is_openai_available,
            "description": "Latest Llama model with advanced reasoning and helpful responses",
            "recommended_for": ["complex reasoning", "helpful assistance", "natural conversations"],
            "enhancement_llm": "gpt-4o-mini"
        }
    }
    
    return {
        "models": models,
        "total_available": sum(1 for model in models.values() if model["available"]),
        "enhancement_strategy": "All models use GPT-4o mini for enhancement with model-specific prompts",
        "recommendation": "gpt-4o-mini" if is_openai_available else None,
        "unified_enhancement": {
            "enabled": True,
            "enhancement_llm": "gpt-4o-mini",
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
            "service": "AI Magic Prompt Enhancer",
            "version": settings.version,
            "status": "operational",
            "enhancement_engine": "GPT-4o mini with model-specific prompts",
            "supported_models": [
                "gpt-4o", "gpt-4o-mini", "gpt-4", "gpt-3.5-turbo",
                "claude-3-5-sonnet", "claude-3-opus", "claude-3-sonnet", "claude-3-haiku",
                "gemini-pro", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"
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
        stats = await db_service.get_user_stats(email=email)
        
        if not stats:
            return {"count": 0, "email": email}
        
        return {
            "count": stats["enhanced_prompts"],
            "email": email,
            "name": stats.get("name")
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
async def stream_enhance_prompt(request: EnhanceRequest):
    """Stream enhanced prompt in chunks for magical animation using unified enhancement"""
    try:
        # Use the unified enhancer
        enhancer = get_enhancer()
        
        # Get the target model
        target_model = request.target_model or LLMModel.GPT4O_MINI
        detected_model = target_model.value
        
        # Get enhanced text using unified enhancement
        result = await enhancer.enhance(request.prompt, target_model)
        enhanced_text = result.enhanced
        
        async def generate_stream():
            """Generate streaming response for magical animation"""
            # Send initial metadata
            yield f"data: {json.dumps({'type': 'model', 'data': detected_model})}\n\n"
            yield f"data: {json.dumps({'type': 'enhancer', 'data': 'gpt-4o-mini'})}\n\n"
            yield f"data: {json.dumps({'type': 'start', 'data': f'Enhancing with {detected_model}-specific prompts...'})}\n\n"
            
            # Stream the enhanced text word by word for animation
            words = enhanced_text.split()
            current_text = ""
            
            for i, word in enumerate(words):
                current_text += word + " "
                
                # Send chunk with progress
                chunk_data = {
                    'type': 'chunk',
                    'data': current_text.strip(),
                    'progress': round((i + 1) / len(words) * 100, 1),
                    'word_count': i + 1,
                    'total_words': len(words)
                }
                
                yield f"data: {json.dumps(chunk_data)}\n\n"
                
                # Add realistic delay for animation (faster for short words)
                delay = 0.05 if len(word) < 4 else 0.08
                await asyncio.sleep(delay)
            
            # Send completion
            yield f"data: {json.dumps({'type': 'complete', 'data': enhanced_text})}\n\n"
            yield "data: [DONE]\n\n"
        
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
        
        # Fallback response
        async def fallback_stream():
            # Use the unified fallback based on target model
            target_model = request.target_model or LLMModel.GPT4O_MINI
            model_name = target_model.value
            
            # Create fallback enhancement based on target model
            if model_name.startswith("gpt"):
                fallback_text = f"You are an expert assistant. Please help with the following request: {request.prompt}. Provide a comprehensive and well-structured response."
            elif model_name.startswith("claude"):
                fallback_text = f"<task>Please help me with the following request</task>\n<request>{request.prompt}</request>\n<format>Please provide a thorough and well-organized response</format>\nThank you for your assistance!"
            elif model_name.startswith("gemini"):
                fallback_text = f"Help me with the following request: {request.prompt}\n\n• Provide comprehensive information\n• Use clear organization\n• Include practical examples when helpful\n\nPlease explain your approach step-by-step."
            elif model_name.startswith("perplexity"):
                fallback_text = f"Research and provide comprehensive information about: {request.prompt}\n\n• **Key findings**: Thorough analysis with current information\n• **Source requirements**: Credible, up-to-date sources with citations\n• **Verification**: Cross-reference multiple authoritative sources\n• **Multiple perspectives**: Include different viewpoints and approaches\n\nPlease prioritize factual accuracy and cite reliable sources."
            elif model_name.startswith("meta"):
                fallback_text = f"Hello! I'm Meta AI, and I'm here to help you with: {request.prompt}\n\n🎯 **My approach will be:**\n• **Conversational & Natural**: I'll engage with you like a knowledgeable friend\n• **Helpful & Practical**: Focus on actionable insights and real-world applications\n• **Current & Informed**: Drawing from up-to-date information and diverse perspectives\n• **Clear & Organized**: Present information in an easy-to-understand format\n• **Thoughtful & Thorough**: Consider multiple angles while being concise\n\nI'm designed to be genuinely helpful while maintaining accuracy and providing valuable context. Let me assist you with this thoughtfully and comprehensively."
            else:
                fallback_text = f"Please provide a detailed and helpful response to: {request.prompt}"
                
            yield f"data: {json.dumps({'type': 'model', 'data': model_name})}\n\n"
            yield f"data: {json.dumps({'type': 'enhancer', 'data': 'fallback'})}\n\n"
            yield f"data: {json.dumps({'type': 'complete', 'data': fallback_text})}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            fallback_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )