import sys
import os
import re
import logging
import time
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from app.api import websocket, enhance as enhance_router
from app.api.v1.endpoints import enhance as enhance_v1_endpoints, users as users_v1_endpoints, payment as payment_endpoints
from app.middleware.rate_limiter import rate_limiter
from app.monitoring.health_monitor import get_health_monitor
from app.core.config import config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="PromptGrammerly API",
    description="your personal PromptEngineer",
    version="2.0.4",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Configure this properly for production
)

# CORS middleware - Enhanced for Chrome extension compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*",  # Allow all origins for development
        "chrome-extension://*",  # Explicitly allow Chrome extensions
        "https://prompter-production-76a3.up.railway.app",  # Production backend
        "http://localhost:8000",  # Local development
        "http://localhost:3000",  # Local frontend
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "*",
        "Content-Type",
        "Authorization", 
        "X-User-Email",
        "X-User-ID",
        "Cache-Control",
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers"
    ],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight for 1 hour
)

# Rate limiting middleware - 30 requests/month per user
app.middleware("http")(rate_limiter)

# CORS headers middleware
@app.middleware("http")
async def add_cors_headers(request, call_next):
    """Add CORS headers to all responses"""
    response = await call_next(request)
    
    # Add CORS headers to all responses
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Expose-Headers"] = "*"
    response.headers["Access-Control-Max-Age"] = "3600"
    
    return response

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url}")
    
    try:
        response = await call_next(request)
        
        # Log response and record for health monitoring
        process_time = time.time() - start_time
        logger.info(f"Response: {response.status_code} - {process_time:.3f}s")
        
        # Record request for health monitoring
        health_monitor = get_health_monitor()
        health_monitor.record_request(
            path=str(request.url.path),
            method=request.method,
            response_time=process_time,
            status_code=response.status_code
        )
        
        return response
        
    except Exception as e:
        # Log errors
        process_time = time.time() - start_time
        logger.error(f"Request failed: {str(e)} - {process_time:.3f}s")
        
        # Record error for health monitoring
        health_monitor = get_health_monitor()
        health_monitor.record_request(
            path=str(request.url.path),
            method=request.method,
            response_time=process_time,
            status_code=500
        )
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url)
            }
        )

# Include routers
app.include_router(enhance_v1_endpoints.router, prefix="/api/v1")
app.include_router(users_v1_endpoints.router, prefix="/api/v1")
app.include_router(payment_endpoints.router, prefix="/api/v1/payment", tags=["payment"])
try:
    print(" Loading streaming enhance router...")
    app.include_router(enhance_router.router, prefix="/api")  # Add streaming endpoint
    print(" Streaming enhance router loaded successfully")
except Exception as e:
    print(f" Failed to load streaming enhance router: {e}")
    import traceback
    traceback.print_exc()
app.include_router(websocket.router)

# Explicit OPTIONS handler for CORS preflight requests
@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests for all endpoints"""
    return JSONResponse(
        status_code=200,
        content={},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600"
        }
    )

@app.get("/")
async def root():
    """API information and status"""
    return {
        "name": "Prompt Assistant API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "health_detailed": "/health/detailed",
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
            "Fallback mechanisms",
            "Circuit breaker pattern",
            "Database health monitoring"
        ]
    }

@app.get("/health")
async def health_check():
    """Simple health check for load balancers"""
    health_monitor = get_health_monitor()
    health_status = await health_monitor.get_simple_health()
    
    if health_status["status"] == "healthy":
        return health_status
    else:
        return JSONResponse(
            status_code=503,
            content=health_status
        )

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with comprehensive system and database metrics"""
    health_monitor = get_health_monitor()
    health_status = await health_monitor.get_health_status()
    
    if health_status["status"] == "healthy":
        return health_status
    else:
        return JSONResponse(
            status_code=503,
            content=health_status
        )

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
                "/health",
                "/health_detailed",
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