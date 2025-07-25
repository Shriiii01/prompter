#!/usr/bin/env python3
"""
Test script to verify user stats functionality
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

async def test_user_stats():
    """Test the user stats functionality"""
    print("🧪 Testing User Stats System...")
    
    test_email = "test@example.com"
    test_user_info = {
        "name": "Test User",
        "email": test_email
    }
    
    try:
        # Test 1: Create/get user
        print(f"\n1. Testing user creation/retrieval...")
        user = await db_service.get_or_create_user(test_email, test_user_info)
        print(f"✅ User created/retrieved: {user['email']} (ID: {user['id']})")
        
        # Test 2: Get initial stats
        print(f"\n2. Testing initial stats retrieval...")
        stats = await db_service.get_user_stats(test_email)
        if stats:
            initial_count = stats['enhanced_prompts']
            print(f"✅ Initial prompt count: {initial_count}")
        else:
            print("❌ Failed to get user stats")
            return
        
        # Test 3: Increment prompts
        print(f"\n3. Testing prompt increment...")
        for i in range(3):
            new_count = await db_service.increment_user_prompts(test_email)
            print(f"   Increment {i+1}: {new_count}")
        
        # Test 4: Verify final stats
        print(f"\n4. Testing final stats...")
        final_stats = await db_service.get_user_stats(test_email)
        if final_stats:
            final_count = final_stats['enhanced_prompts']
            expected_count = initial_count + 3
            if final_count == expected_count:
                print(f"✅ Final count correct: {final_count} (expected: {expected_count})")
            else:
                print(f"❌ Count mismatch: got {final_count}, expected {expected_count}")
        else:
            print("❌ Failed to get final stats")
        
        # Test 5: Global stats
        print(f"\n5. Testing global stats...")
        global_stats = await db_service.get_global_stats()
        print(f"✅ Global stats: {global_stats['total_users']} users, {global_stats['total_prompts_enhanced']} total prompts")
        
        print(f"\n🎉 All tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(test_user_stats()) 