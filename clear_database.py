#!/usr/bin/env python3
"""
Script to clear database and reset all user counts
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

async def clear_database():
    """Clear all user data and reset counts"""
    print("🗑️ Clearing Database...")
    
    try:
        # Initialize database connection
        db_service._init_supabase()
        
        # Get all users first
        result = db_service.supabase.table('users').select('*').execute()
        users = result.data
        
        if users:
            print(f"📊 Found {len(users)} users in database:")
            for user in users:
                print(f"   - {user['email']}: {user.get('enhanced_prompts', 0)} prompts")
            
            # Clear all user data
            print("\n🧹 Clearing all user data...")
            delete_result = db_service.supabase.table('users').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            
            print(f"✅ Deleted {len(delete_result.data)} user records")
        else:
            print("📊 No users found in database")
        
        # Verify database is empty
        verify_result = db_service.supabase.table('users').select('*').execute()
        remaining_users = verify_result.data
        
        if not remaining_users:
            print("✅ Database cleared successfully!")
        else:
            print(f"⚠️ {len(remaining_users)} users still remain in database")
            
    except Exception as e:
        print(f"❌ Error clearing database: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        await db_service.close()

if __name__ == "__main__":
    print("🚨 WARNING: This will delete ALL user data and reset all counts to 0!")
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        asyncio.run(clear_database())
    else:
        print("❌ Database clear cancelled") 