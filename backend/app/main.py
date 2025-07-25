"""
Main FastAPI application for the Prompt Enhancer backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.enhance import router as enhance_router
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Magic - Prompt Enhancer API",
    description="A powerful API for enhancing AI prompts with model-specific optimizations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your Chrome extension's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
        )

# Include routers
app.include_router(enhance_router)

@app.get("/")
async def root():
    """Welcome message"""
    return {
        "message": "🎬 AI Magic - Prompt Enhancer API",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "Unlimited prompt enhancement",
            "Model-specific optimizations",
            "Google OAuth authentication",
            "Auto-detection of target models"
            ]
        }

@app.get("/health")
async def health_check():
    """Simple health check"""
    return {"status": "healthy", "service": "prompt-enhancer"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 