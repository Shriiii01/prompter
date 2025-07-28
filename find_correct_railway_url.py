#!/usr/bin/env python3
"""
Find the correct Railway URL format
"""
import requests
import time

def test_url(url, description):
    """Test a URL and return results"""
    print(f"\n🧪 Testing: {description}")
    print(f"   URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            content = response.text[:200].lower()
            if "railway api" in content and "home of the railway api" in content:
                print("   ❌ Railway default page")
                return False
            elif "prompt assistant" in content or "fastapi" in content or "api" in content:
                print("   ✅ FastAPI app detected!")
                return True
            else:
                print(f"   ✅ Custom content: {response.text[:100]}...")
                return True
        else:
            print(f"   ⚠️ Status {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    print("🔍 Finding Correct Railway URL")
    print("=" * 50)
    
    # Test different URL formats
    base_urls = [
        "https://prompter-production-76a3.railway.app",
        "https://prompter-production-76a3.up.railway.app", 
        "https://prompter-production-76a3.railway.app:8000",
        "https://prompter-production-76a3.up.railway.app:8000",
        "http://prompter-production-76a3.railway.app",
        "http://prompter-production-76a3.up.railway.app"
    ]
    
    working_urls = []
    
    for url in base_urls:
        if test_url(url, f"Base URL: {url}"):
            working_urls.append(url)
            
        # Also test with /api/v1/health endpoint
        health_url = url + "/api/v1/health"
        if test_url(health_url, f"Health endpoint: {health_url}"):
            working_urls.append(url)
    
    print("\n" + "=" * 50)
    print("📋 RESULTS:")
    
    if working_urls:
        print("✅ Working URLs found:")
        for url in working_urls:
            print(f"   - {url}")
        
        print(f"\n🎯 RECOMMENDED URL: {working_urls[0]}")
        print("Update your extension config with this URL!")
    else:
        print("❌ No working URLs found")
        print("The backend might not be properly deployed")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    main() 