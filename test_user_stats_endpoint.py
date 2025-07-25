#!/usr/bin/env python3
"""
Script to test the user stats endpoint manually
"""
import asyncio
import sys
import os
import requests
import json

# Change to backend directory to load .env file
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
os.chdir(backend_dir)

# Add backend to path
sys.path.append(backend_dir)

# Import settings which will load .env automatically
from config import settings
from app.services.database import db_service

def test_user_stats_endpoint():
    """Test the user stats endpoint"""
    print("🧪 Testing User Stats Endpoint")
    print("=" * 50)
    
    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        response = requests.get('http://localhost:8004/api/v1/health', timeout=5)
        print(f"   ✅ Health check: {response.status_code}")
        if response.ok:
            health_data = response.json()
            print(f"   📊 Backend status: {health_data.get('status', 'unknown')}")
    except Exception as e:
        print(f"   ❌ Health check failed: {e}")
        return
    
    # Test 2: User stats without auth (should fail)
    print("\n2. Testing user stats without auth...")
    try:
        response = requests.get('http://localhost:8004/api/v1/user/stats', timeout=5)
        print(f"   📡 Response: {response.status_code}")
        if not response.ok:
            error_data = response.json()
            print(f"   ❌ Expected error: {error_data.get('detail', 'unknown error')}")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    # Test 3: Check database directly
    print("\n3. Checking database directly...")
    try:
        # Get user stats directly from database
        stats = asyncio.run(db_service.get_user_stats(email='shrijambhale8@gmail.com'))
        if stats:
            print(f"   ✅ Database has user: {stats['email']}")
            print(f"   📊 Enhanced prompts: {stats['enhanced_prompts']}")
            print(f"   👤 Name: {stats.get('name', 'N/A')}")
        else:
            print("   ❌ User not found in database")
    except Exception as e:
        print(f"   ❌ Database check failed: {e}")
    
    # Test 4: Test with invalid token
    print("\n4. Testing with invalid token...")
    try:
        response = requests.get(
            'http://localhost:8004/api/v1/user/stats',
            headers={'Authorization': 'Bearer invalid-token'},
            timeout=5
        )
        print(f"   📡 Response: {response.status_code}")
        if not response.ok:
            error_data = response.json()
            print(f"   ❌ Expected error: {error_data.get('detail', 'unknown error')}")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")

if __name__ == "__main__":
    test_user_stats_endpoint() 