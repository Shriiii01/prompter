#!/usr/bin/env python3
"""
Find all Railway deployments for your project
"""
import requests
import time

def test_railway_deployments():
    print("🔍 Testing All Possible Railway URLs...")
    
    # Common Railway URL patterns for your project
    possible_urls = [
        # Standard patterns
        "https://prompter-production.railway.app",
        "https://prompter-production-76a3.up.railway.app",
        "https://prompter.up.railway.app",
        "https://prompter-backend.up.railway.app",
        "https://prompter-api.up.railway.app",
        "https://prompter-app.up.railway.app",
        
        # Alternative patterns
        "https://prompter-production.railway.app",
        "https://prompter.railway.app",
        "https://prompter-backend.railway.app",
        "https://prompter-api.railway.app",
        
        # With different suffixes
        "https://prompter-production-1.up.railway.app",
        "https://prompter-production-2.up.railway.app",
        "https://prompter-1.up.railway.app",
        "https://prompter-2.up.railway.app",
    ]
    
    working_urls = []
    
    for url in possible_urls:
        print(f"\n🌐 Testing: {url}")
        try:
            # Test health endpoint
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code == 200:
                print(f"✅ HEALTH ENDPOINT: {response.status_code} - {response.text[:50]}...")
                working_urls.append((url, "health"))
                continue
                
            # Test root endpoint
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                content = response.text.lower()
                if "prompt assistant" in content or "fastapi" in content or "api" in content:
                    print(f"✅ ROOT ENDPOINT: {response.status_code} - API detected!")
                    working_urls.append((url, "root"))
                    continue
                elif "railway" in content and "api" not in content:
                    print(f"⚠️ ROOT ENDPOINT: {response.status_code} - Default Railway page")
                else:
                    print(f"✅ ROOT ENDPOINT: {response.status_code} - Custom content")
                    working_urls.append((url, "root"))
                    
        except requests.exceptions.RequestException as e:
            print(f"❌ Error: {str(e)[:50]}...")
    
    return working_urls

def check_railway_dashboard():
    print("\n📋 RAILWAY DASHBOARD CHECK:")
    print("1. Go to: https://railway.app/dashboard")
    print("2. Find your project")
    print("3. Click on the project")
    print("4. Look for 'Domains' section")
    print("5. Copy ALL the URLs listed there")
    print("6. Test each URL with: curl https://your-url/health")

def test_specific_url(url):
    """Test a specific URL provided by user"""
    print(f"\n🧪 Testing specific URL: {url}")
    
    endpoints = ["/health", "/api/v1/health", "/"]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{url}{endpoint}", timeout=5)
            print(f"✅ {endpoint}: {response.status_code}")
            if response.status_code == 200:
                print(f"   Content: {response.text[:100]}...")
        except requests.exceptions.RequestException as e:
            print(f"❌ {endpoint}: Error - {str(e)[:50]}...")

if __name__ == "__main__":
    print("🚀 Railway Deployment Finder")
    print("=" * 50)
    
    # Test all possible URLs
    working_urls = test_railway_deployments()
    
    if working_urls:
        print(f"\n🎯 FOUND {len(working_urls)} WORKING URL(S):")
        for url, endpoint_type in working_urls:
            print(f"✅ {url} ({endpoint_type})")
        
        print(f"\n📝 UPDATE THESE FILES WITH THE CORRECT URL:")
        print("- chrome-extension/config.js")
        print("- chrome-extension/magical-enhancer.js")
        print("- chrome-extension/popup.js")
    else:
        print("\n❌ No working URLs found")
        check_railway_dashboard()
    
    print("\n" + "=" * 50)
    print("✅ Check completed!")
    
    # Ask user for specific URL to test
    print("\n💡 If you know your Railway URL, you can test it directly:")
    print("Example: python find_railway_deployments.py https://your-url.railway.app") 