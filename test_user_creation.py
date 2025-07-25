#!/usr/bin/env python3
"""
Test script to manually create a user and test the system
"""

import asyncio
import sys
import os

# Change to backend directory to load .env file
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
os.chdir(backend_dir)

# Add backend to path
sys.path.append(backend_dir)

from app.services.database import db_service

async def test_user_creation():
    """Test creating a user manually"""
    print("🧪 Testing User Creation...")
    
    test_email = "shrijambhale8@gmail.com"
    test_user_info = {
        "name": "shri",
        "email": test_email
    }
    
    try:
        # Test 1: Create user
        print(f"\n1. Creating user: {test_email}")
        user = await db_service.get_or_create_user(test_email, test_user_info)
        print(f"✅ User created/retrieved: {user['email']} (ID: {user['id']})")
        print(f"   Name: {user.get('name', 'Not set')}")
        print(f"   Enhanced Prompts: {user.get('enhanced_prompts', 0)}")
        
        # Test 2: Get user stats
        print(f"\n2. Getting user stats...")
        stats = await db_service.get_user_stats(test_email)
        if stats:
            print(f"✅ User stats retrieved: {stats['enhanced_prompts']} prompts")
        else:
            print("❌ Failed to get user stats")
        
        # Test 3: Increment prompts
        print(f"\n3. Testing prompt increment...")
        new_count = await db_service.increment_user_prompts(test_email)
        print(f"✅ Prompt count incremented to: {new_count}")
        
        # Test 4: Verify final stats
        print(f"\n4. Final verification...")
        final_stats = await db_service.get_user_stats(test_email)
        if final_stats:
            print(f"✅ Final count: {final_stats['enhanced_prompts']} prompts")
        
        print(f"\n🎉 User creation and tracking test completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(test_user_creation()) 