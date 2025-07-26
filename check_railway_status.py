#!/usr/bin/env python3
"""
Check Railway deployment status
"""
import requests
import json

def check_railway_status():
    print("🔍 Checking Railway Deployment Status...")
    
    # Test URLs that are working
    urls = [
        "https://prompter-production.railway.app",
        "https://prompter.railway.app",
        "https://prompter-backend.railway.app",
        "https://prompter-api.railway.app"
    ]
    
    for url in urls:
        print(f"\n🌐 Testing: {url}")
        
        # Test root endpoint
        try:
            response = requests.get(url, timeout=10)
            print(f"✅ Root: {response.status_code}")
            
            if response.status_code == 200:
                content = response.text.lower()
                if "railway api" in content and "home of the railway api" in content:
                    print("🚨 ISSUE: Showing default Railway page (app not running)")
                    print("   - Your FastAPI app is not responding")
                    print("   - Check Railway logs for errors")
                    print("   - App might have crashed")
                elif "prompt assistant" in content or "fastapi" in content:
                    print("✅ SUCCESS: FastAPI app is running!")
                else:
                    print(f"⚠️ Unknown content: {response.text[:100]}...")
                    
        except requests.exceptions.RequestException as e:
            print(f"❌ Error: {e}")
        
        # Test health endpoint
        try:
            response = requests.get(f"{url}/health", timeout=5)
            print(f"✅ Health: {response.status_code} - {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Health Error: {e}")

def provide_solutions():
    print("\n🔧 SOLUTIONS:")
    print("1. Check Railway Dashboard:")
    print("   - Go to: https://railway.app/dashboard")
    print("   - Find your project")
    print("   - Check 'Logs' for errors")
    print("   - Check 'Deployments' for failed builds")
    
    print("\n2. Restart the deployment:")
    print("   - In Railway dashboard, click 'Redeploy'")
    print("   - Or use CLI: railway up")
    
    print("\n3. Check environment variables:")
    print("   - Ensure all required env vars are set")
    print("   - Check for missing API keys")
    
    print("\n4. Check the correct URL:")
    print("   - Copy the exact URL from Railway dashboard")
    print("   - Update extension config files")

if __name__ == "__main__":
    print("🚀 Railway Status Checker")
    print("=" * 50)
    
    check_railway_status()
    provide_solutions()
    
    print("\n" + "=" * 50)
    print("✅ Check completed!") 