#!/usr/bin/env python3
"""
Test the correct Railway URL from the dashboard
"""
import requests
import time

def test_railway_url():
    print("🔍 Testing Railway URL from Dashboard...")
    
    # The URL from your dashboard
    main_url = "https://prompter-production-76a3.up.railway.app"
    
    print(f"🌐 Testing main URL: {main_url}")
    
    # Test with different endpoints
    endpoints = [
        "/",
        "/health", 
        "/api/v1/health",
        "/docs"
    ]
    
    for endpoint in endpoints:
        url = main_url + endpoint
        print(f"\n🧪 Testing: {endpoint}")
        try:
            response = requests.get(url, timeout=10)
            print(f"✅ Status: {response.status_code}")
            if response.status_code == 200:
                content = response.text[:200]
                print(f"✅ Content: {content}...")
                
                # Check if it's the FastAPI app
                if "prompt assistant" in content.lower() or "fastapi" in content.lower():
                    print("🎯 SUCCESS! FastAPI app is running!")
                    return True
                elif "railway api" in content.lower():
                    print("⚠️ Still showing Railway default page")
                else:
                    print("✅ Custom content detected")
                    
        except requests.exceptions.ConnectionError as e:
            print(f"❌ Connection Error: {e}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Request Error: {e}")
    
    return False

def test_alternative_urls():
    print("\n🔍 Testing Alternative URL Patterns...")
    
    # Alternative patterns based on your dashboard
    alternatives = [
        "https://prompter-production-76a3.up.railway.app",
        "https://prompter-production-76a3.railway.app", 
        "https://prompter-production.up.railway.app",
        "https://prompter.up.railway.app"
    ]
    
    for url in alternatives:
        print(f"\n🌐 Testing: {url}")
        try:
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code == 200:
                print(f"✅ Health endpoint works: {response.text}")
                return url
        except requests.exceptions.RequestException as e:
            print(f"❌ Error: {str(e)[:50]}...")
    
    return None

def provide_manual_check():
    print("\n📋 MANUAL CHECK REQUIRED:")
    print("1. Open your browser")
    print("2. Go to: https://prompter-production-76a3.up.railway.app")
    print("3. Check if the page loads")
    print("4. If it doesn't work, check Railway dashboard for:")
    print("   - Different domain name")
    print("   - Custom domain settings")
    print("   - DNS propagation status")
    
    print("\n🔧 RAILWAY DASHBOARD CHECKS:")
    print("1. Go to Settings tab")
    print("2. Check 'Public Networking' section")
    print("3. Look for any custom domains")
    print("4. Check if there are multiple domains listed")

if __name__ == "__main__":
    print("🚀 Railway URL Tester")
    print("=" * 50)
    
    # Test the main URL
    if test_railway_url():
        print("\n✅ SUCCESS! Your FastAPI app is running!")
    else:
        print("\n❌ Main URL not working")
        
        # Test alternatives
        working_url = test_alternative_urls()
        if working_url:
            print(f"\n🎯 FOUND WORKING URL: {working_url}")
            print("Update your extension config with this URL!")
        else:
            print("\n❌ No working URLs found")
            provide_manual_check()
    
    print("\n" + "=" * 50)
    print("✅ Test completed!") 