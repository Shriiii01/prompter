import sys
import os
from datetime import datetime
# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from app.enhancement import endpoints as enhance_router
from app.users import endpoints as users_endpoints
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

# Rate limiting middleware - 100 requests/hour per user
app.middleware("http")(rate_limiter)

# Include routers
app.include_router(users_endpoints.router, prefix="/api/v1")
app.include_router(enhance_router.router, prefix="/api")  # Add streaming endpoint

@app.get("/health")
async def health_check():
    """Simple health check for load balancers"""
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
                "/health",
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

# Run the server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")