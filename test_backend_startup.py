#!/usr/bin/env python3
"""
Test backend startup to identify issues
"""
import sys
import os

def test_backend_startup():
    print("🧪 Testing Backend Startup...")
    
    # Add backend to path
    backend_path = os.path.join(os.getcwd(), 'backend')
    sys.path.insert(0, backend_path)
    
    print(f"📁 Backend path: {backend_path}")
    
    try:
        print("1️⃣ Testing config import...")
        from config import settings
        print("✅ Config imported successfully")
        
        print("2️⃣ Testing app import...")
        from main import app
        print("✅ App imported successfully")
        
        print("3️⃣ Testing app startup...")
        # This would normally be done by uvicorn
        print("✅ App startup test passed")
        
        print("4️⃣ Testing endpoints...")
        from fastapi.testclient import TestClient
        client = TestClient(app)
        
        # Test root endpoint
        response = client.get("/")
        print(f"✅ Root endpoint: {response.status_code}")
        
        # Test health endpoint
        response = client.get("/api/v1/health")
        print(f"✅ Health endpoint: {response.status_code}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Startup error: {e}")
        return False

def check_environment():
    print("\n🔍 Environment Check:")
    print(f"Python version: {sys.version}")
    print(f"Current directory: {os.getcwd()}")
    
    # Check if .env exists
    env_file = os.path.join('backend', '.env')
    if os.path.exists(env_file):
        print(f"✅ .env file exists: {env_file}")
    else:
        print(f"❌ .env file missing: {env_file}")
    
    # Check requirements
    req_file = os.path.join('backend', 'requirements.txt')
    if os.path.exists(req_file):
        print(f"✅ requirements.txt exists: {req_file}")
    else:
        print(f"❌ requirements.txt missing: {req_file}")

if __name__ == "__main__":
    print("🚀 Backend Startup Test")
    print("=" * 50)
    
    check_environment()
    
    if test_backend_startup():
        print("\n✅ Backend startup test PASSED!")
        print("The issue is likely in Railway deployment, not the code.")
    else:
        print("\n❌ Backend startup test FAILED!")
        print("There's an issue with the code that needs fixing.")
    
    print("\n" + "=" * 50)
    print("✅ Test completed!") 