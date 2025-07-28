#!/usr/bin/env python3
"""
Comprehensive Railway deployment test
"""
import requests
import time

def test_railway_deployment():
    print("🔍 Testing Railway Deployment After GitHub Push...")
    
    url = "https://prompter-production-76a3.railway.app"
    
    print(f"🌐 Testing URL: {url}")
    
    # Test different endpoints
    endpoints = [
        ("/", "Root endpoint"),
        ("/health", "Health endpoint"),
        ("/api/v1/health", "API health endpoint"),
        ("/docs", "API docs"),
        ("/api/v1/enhance", "Enhance endpoint")
    ]
    
    for endpoint, description in endpoints:
        full_url = url + endpoint
        print(f"\n🧪 Testing {description}: {endpoint}")
        
        try:
            response = requests.get(full_url, timeout=10)
            print(f"✅ Status: {response.status_code}")
            
            if response.status_code == 200:
                content = response.text[:200].lower()
                if "railway api" in content and "home of the railway api" in content:
                    print("🚨 ISSUE: Still showing Railway default page")
                    print("   - FastAPI app is not running")
                    print("   - Deployment might have failed")
                elif "prompt assistant" in content or "fastapi" in content:
                    print("🎯 SUCCESS: FastAPI app is running!")
                    return True
                else:
                    print(f"✅ Custom content: {response.text[:100]}...")
            elif response.status_code == 404:
                print("⚠️ 404 Not Found - endpoint doesn't exist")
            else:
                print(f"⚠️ Unexpected status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error: {e}")
    
    return False

def check_deployment_status():
    print("\n📋 DEPLOYMENT STATUS CHECK:")
    print("1. Go to Railway dashboard")
    print("2. Check if new deployment is in progress")
    print("3. Look for any error messages in logs")
    print("4. Check if environment variables are set")
    
    print("\n🔧 POSSIBLE ISSUES:")
    print("1. Deployment still in progress (wait 2-3 minutes)")
    print("2. Environment variables missing")
    print("3. Build failed")
    print("4. App crashed on startup")

if __name__ == "__main__":
    print("🚀 Railway Deployment Test")
    print("=" * 50)
    
    if test_railway_deployment():
        print("\n✅ SUCCESS! Your FastAPI app is running!")
        print("The extension should work now!")
    else:
        print("\n❌ ISSUE: FastAPI app is not running")
        check_deployment_status()
    
    print("\n" + "=" * 50)
    print("✅ Test completed!") 