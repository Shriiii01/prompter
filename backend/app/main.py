import sys
import os
import re
import logging
import time
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from api import enhance, websocket
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('../app.log', mode='a')
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Prompt Assistant API",
    description="AI-powered prompt enhancement service with Perplexity and Meta AI support",
    version="1.0.1",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Configure this properly for production
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        logger.info(f"Response: {response.status_code} - {process_time:.3f}s")
        
        return response
        
    except Exception as e:
        # Log errors
        process_time = time.time() - start_time
        logger.error(f"Request failed: {str(e)} - {process_time:.3f}s")
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url)
            }
        )

# Include routers
app.include_router(enhance.router)
app.include_router(websocket.router)

@app.get("/")
async def root():
    """API information and status"""
    return {
        "name": "Prompt Assistant API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/api/v1/health",
            "enhance": "/api/v1/enhance",
            "analyze": "/api/v1/analyze",
            "models": "/api/v1/models",
            "docs": "/docs"
        },
        "features": [
            "AI-powered prompt enhancement",
            "Multi-model support (OpenAI, Anthropic, Gemini)",
            "Quality analysis",
            "Caching for performance",
            "Fallback mechanisms"
        ]
    }

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "message": f"The requested endpoint {request.url.path} does not exist",
            "available_endpoints": [
                "/",
                "/api/v1/health",
                "/api/v1/enhance",
                "/api/v1/analyze",
                "/api/v1/models",
                "/docs"
            ]
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler"""
    logger.error(f"Internal server error: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later.",
            "timestamp": datetime.now().isoformat()
        }
    )

def clean_enhanced_text(text):
    # Remove 'Enhanced prompt:' and any leading/trailing quotes/whitespace
    text = re.sub(r'^\\s*Enhanced prompt:\\s*', '', text, flags=re.IGNORECASE)
    text = text.strip(' "\'')
    return text

# Run the server
if __name__ == "__main__":
    logger.info("Starting Prompt Assistant API server...")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info") 