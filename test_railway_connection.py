#!/usr/bin/env python3
"""
Test Railway connection and port configuration
"""
import requests
import time

def test_railway_connection():
    print("🔍 Testing Railway Connection...")
    
    # Test URLs
    urls = [
        "https://prompter-production-76a3.up.railway.app/api/v1/health",
        "https://prompter-production-76a3.up.railway.app/health",
        "https://prompter-production-76a3.up.railway.app/"
    ]
    
    for url in urls:
        print(f"\n🌐 Testing: {url}")
        try:
            response = requests.get(url, timeout=10)
            print(f"✅ Status: {response.status_code}")
            print(f"✅ Response: {response.text[:200]}...")
            
            if response.status_code == 200:
                print("🎯 SUCCESS! Railway is working!")
                return True
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error: {e}")
    
    print("\n🚨 RAILWAY CONNECTION FAILED!")
    print("Possible issues:")
    print("1. Railway app is not running")
    print("2. Wrong URL")
    print("3. Port configuration issue")
    print("4. CORS issues")
    
    return False

def test_extension_endpoints():
    print("\n🔍 Testing Extension Endpoints...")
    
    base_url = "https://prompter-production-76a3.up.railway.app"
    endpoints = [
        "/api/v1/health",
        "/api/v1/quick-test",
        "/api/v1/enhance"
    ]
    
    for endpoint in endpoints:
        url = base_url + endpoint
        print(f"\n🌐 Testing: {endpoint}")
        try:
            if endpoint == "/api/v1/enhance":
                # POST request for enhance endpoint
                response = requests.post(url, json={
                    "prompt": "test",
                    "url": "https://test.com"
                }, timeout=10)
            else:
                # GET request for other endpoints
                response = requests.get(url, timeout=10)
                
            print(f"✅ Status: {response.status_code}")
            print(f"✅ Response: {response.text[:200]}...")
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🚀 Railway Connection Test")
    print("=" * 50)
    
    # Test basic connection
    if test_railway_connection():
        # Test extension endpoints
        test_extension_endpoints()
    
    print("\n" + "=" * 50)
    print("✅ Test completed!") 