#!/usr/bin/env python3
"""
Test script to increment user prompts
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

async def test_increment():
    """Test incrementing user prompts"""
    email = "shrijambhale8@gmail.com"
    
    try:
        # Get current count
        stats = await db_service.get_user_stats(email)
        current_count = stats['enhanced_prompts'] if stats else 0
        print(f"📊 Current count: {current_count}")
        
        # Increment by 2 (to match your 2 enhancements)
        print(f"🔄 Incrementing by 2...")
        for i in range(2):
            new_count = await db_service.increment_user_prompts(email)
            print(f"   Increment {i+1}: {new_count}")
        
        # Check final count
        final_stats = await db_service.get_user_stats(email)
        final_count = final_stats['enhanced_prompts'] if final_stats else 0
        print(f"✅ Final count: {final_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(test_increment()) 