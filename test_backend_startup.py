#!/usr/bin/env python3
"""
Test backend startup to identify issues
"""
import os
import sys
import subprocess

def test_backend_startup():
    print("🔍 Testing Backend Startup...")
    
    # Change to backend directory
    os.chdir("backend")
    
    # Test 1: Check if main.py can be imported
    print("\n🧪 Test 1: Import main.py")
    try:
        import main
        print("✅ main.py imports successfully")
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False
    
    # Test 2: Check if app can be created
    print("\n🧪 Test 2: Create FastAPI app")
    try:
        app = main.app
        print("✅ FastAPI app created successfully")
    except Exception as e:
        print(f"❌ App creation error: {e}")
        return False
    
    # Test 3: Check environment variables
    print("\n🧪 Test 3: Check environment variables")
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️ Missing environment variables: {missing_vars}")
        print("These might cause issues on Railway")
    else:
        print("✅ All required environment variables are set")
    
    # Test 4: Check if uvicorn can start (briefly)
    print("\n🧪 Test 4: Test uvicorn startup")
    try:
        # Try to start uvicorn for 5 seconds
        process = subprocess.Popen([
            "python", "-m", "uvicorn", "main:app", 
            "--host", "0.0.0.0", "--port", "8000"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait a bit for startup
        import time
        time.sleep(3)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ Uvicorn started successfully")
            process.terminate()
            process.wait()
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Uvicorn failed to start")
            print(f"Error: {stderr.decode()}")
            return False
            
    except Exception as e:
        print(f"❌ Uvicorn test error: {e}")
        return False
    
    return True

def provide_railway_solutions():
    print("\n🔧 RAILWAY SOLUTIONS:")
    print("1. Check Railway Environment Variables:")
    print("   - Go to Railway dashboard")
    print("   - Click 'Variables' tab")
    print("   - Ensure these are set:")
    print("     * SUPABASE_URL")
    print("     * SUPABASE_SERVICE_KEY")
    print("     * OPENAI_API_KEY")
    print("     * ANTHROPIC_API_KEY")
    
    print("\n2. Check Railway Logs:")
    print("   - Click 'View logs' in deployment")
    print("   - Look for startup errors")
    
    print("\n3. Redeploy if needed:")
    print("   - Click 'Redeploy' button")
    print("   - Or use: railway up")

if __name__ == "__main__":
    print("🚀 Backend Startup Tester")
    print("=" * 50)
    
    if test_backend_startup():
        print("\n✅ Backend startup test passed!")
        print("The issue is likely in Railway environment variables")
        provide_railway_solutions()
    else:
        print("\n❌ Backend startup test failed!")
        print("Fix the issues above before deploying to Railway")
    
    print("\n" + "=" * 50)
    print("✅ Test completed!") 