import sys
import os
import time
from datetime import datetime
# DELETED: re import - NOT USED (clean_enhanced_text function deleted)

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from app.enhancement import router as enhance_router
from app.users import router as users_router
from app.payment import router as payment_router
from app.shared.rate_limiter import rate_limiter
from app.shared.config import config

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

# DELETED: add_cors_headers middleware - DUPLICATE (CORS middleware already handles this on lines 50-76)

# Request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    
    try:
        response = await call_next(request)
        return response
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "timestamp": datetime.now().isoformat(),
                "path": str(request.url)
            }
        )

# Include routers
app.include_router(users_router.router, prefix="/api/v1")
app.include_router(payment_router.router, prefix="/api/v1/payment", tags=["payment"])
try:
    print(" Loading streaming enhance router...")
    app.include_router(enhance_router.router, prefix="/api")  # Add streaming endpoint
    print(" Streaming enhance router loaded successfully")
except Exception as e:
    print(f" Failed to load streaming enhance router: {e}")
    import traceback
    traceback.print_exc()
# DELETED: websocket.router - NOT USED (P button uses /api/stream-enhance, not websocket)

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
        "version": "2.0.4",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "health_detailed": "/health/detailed",
            "enhance": "/api/stream-enhance",
            "docs": "/docs"
        },
        "features": [
            "AI-powered prompt enhancement (GPT-5 Mini)",
            "Model-specific system prompts",
            "In-memory caching for performance"
        ]
    }

@app.get("/health")
async def health_check():
    """Simple health check for load balancers"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

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
                "/health/detailed",
                "/api/stream-enhance",
                "/api/v1/users/{email}/increment",
                "/docs"
            ]
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again later.",
            "timestamp": datetime.now().isoformat()
        }
    )

# DELETED: clean_enhanced_text() function - NEVER CALLED (dead code)

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")