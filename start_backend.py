#!/usr/bin/env python3
"""
Simple startup script for the Prompt Assistant API
"""

import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

if __name__ == "__main__":
    print("🚀 Starting Prompt Assistant API...")
    print("📁 Working directory:", os.getcwd())
    print("🐍 Python path:", sys.path[0])
    
    try:
        from backend.main import app
        import uvicorn
        
        print("✅ Backend loaded successfully")
        print("🌐 Starting server on http://localhost:8000")
        print("📚 API docs available at http://localhost:8000/docs")
        print("🔄 Press Ctrl+C to stop the server")
        
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure you're in the project root directory")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Startup error: {e}")
        sys.exit(1) 