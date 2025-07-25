#!/usr/bin/env python3
"""
Script to reset all user counts to 0 (keep user records, just reset counts)
"""

import asyncio
import sys
import os

# Change to backend directory to load .env file
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
os.chdir(backend_dir)

# Add backend to path
sys.path.append(backend_dir)

# Import settings which will load .env automatically
from config import settings
from app.services.database import db_service

async def reset_user_counts():
    """Reset all user enhanced_prompts counts to 0"""
    print("🔄 Resetting User Counts...")
    
    try:
        # Initialize database connection
        db_service._init_supabase()
        
        # Get all users first to show what we're resetting
        result = db_service.supabase.table('users').select('email, enhanced_prompts').execute()
        users = result.data
        
        if users:
            print(f"📊 Found {len(users)} users in database:")
            for user in users:
                print(f"   - {user['email']}: {user.get('enhanced_prompts', 0)} prompts")
            
            # Reset all counts to 0 (keep user records)
            print("\n🔄 Resetting all counts to 0...")
            update_result = db_service.supabase.table('users').update({
                'enhanced_prompts': 0
            }).neq('id', '00000000-0000-0000-0000-000000000000').execute()
            
            print(f"✅ Reset {len(update_result.data)} user counts to 0")
            
            # Verify the reset
            verify_result = db_service.supabase.table('users').select('email, enhanced_prompts').execute()
            updated_users = verify_result.data
            
            print("\n📊 Updated user counts:")
            for user in updated_users:
                print(f"   - {user['email']}: {user.get('enhanced_prompts', 0)} prompts")
                
        else:
            print("📊 No users found in database")
        
        print("\n✅ All user counts reset to 0 successfully!")
        
    except Exception as e:
        print(f"❌ Error resetting user counts: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        await db_service.close()

if __name__ == "__main__":
    print("🔄 This will reset ALL user enhanced_prompts counts to 0")
    print("   (User records will be kept, only counts will be reset)")
    response = input("Continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        asyncio.run(reset_user_counts())
    else:
        print("❌ Count reset cancelled") 