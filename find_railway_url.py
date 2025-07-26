#!/usr/bin/env python3
"""
Helper script to find the correct Railway URL
"""
import requests
import time

def test_common_railway_patterns():
    print("🔍 Testing Common Railway URL Patterns...")
    
    # Common Railway URL patterns
    base_names = [
        "prompter-production",
        "prompter",
        "prompter-backend",
        "prompter-api",
        "prompter-app"
    ]
    
    # Common Railway domains
    domains = [
        "up.railway.app",
        "railway.app"
    ]
    
    for base_name in base_names:
        for domain in domains:
            url = f"https://{base_name}.{domain}"
            print(f"\n🌐 Testing: {url}")
            try:
                response = requests.get(f"{url}/health", timeout=5)
                if response.status_code == 200:
                    print(f"🎯 SUCCESS! Found working URL: {url}")
                    return url
                else:
                    print(f"⚠️ Status: {response.status_code}")
            except requests.exceptions.RequestException as e:
                print(f"❌ Error: {str(e)[:50]}...")
    
    return None

def check_railway_dashboard():
    print("\n📋 RAILWAY DASHBOARD CHECK:")
    print("1. Go to: https://railway.app/dashboard")
    print("2. Find your project")
    print("3. Click on the project")
    print("4. Look for 'Domains' section")
    print("5. Copy the URL (should look like: https://your-app-name.up.railway.app)")
    print("6. Update chrome-extension/config.js with the correct URL")

if __name__ == "__main__":
    print("🚀 Railway URL Finder")
    print("=" * 50)
    
    found_url = test_common_railway_patterns()
    
    if found_url:
        print(f"\n✅ FOUND WORKING URL: {found_url}")
        print("Update chrome-extension/config.js with this URL!")
    else:
        print("\n❌ No working URL found")
        check_railway_dashboard()
    
    print("\n" + "=" * 50)
    print("✅ Check completed!") 