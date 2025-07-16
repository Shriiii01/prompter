#!/usr/bin/env python3
"""
Simple startup script for the Prompt Enhancer backend server
"""

import os
import sys
import uvicorn

def main():
    """Start the FastAPI server"""
    
    # Check if OpenAI API key is set
    if not os.getenv('OPENAI_API_KEY'):
        print("⚠️  WARNING: OPENAI_API_KEY environment variable not set!")
        print("   The server will start but enhancement will use fallback mode.")
        print("   Set OPENAI_API_KEY to enable GPT-4o mini enhancement.")
        print()
    
    print("🚀 Starting Prompt Enhancer Backend Server...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📖 API docs available at: http://localhost:8000/docs")
    print("🎯 Health check: http://localhost:8000/api/v1/health")
    print()
    
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped gracefully")
    except Exception as e:
        print(f"❌ Server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 