#!/usr/bin/env python3
"""
Script to delete ALL users from database to start fresh
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

async def delete_all_users():
    """Delete ALL users from database"""
    print("🗑️ Deleting ALL Users from Database...")
    print("=" * 50)
    
    try:
        # Initialize database connection
        db_service._init_supabase()
        
        # Get all users first to show what we're deleting
        result = db_service.supabase.table('users').select('*').execute()
        users = result.data
        
        if users:
            print(f"📊 Found {len(users)} users to delete:")
            for i, user in enumerate(users, 1):
                print(f"  {i}. {user['email']} (ID: {user['id']})")
            
            print(f"\n🚨 WARNING: This will PERMANENTLY DELETE all {len(users)} users!")
            response = input("Are you absolutely sure? Type 'DELETE ALL' to confirm: ")
            
            if response == 'DELETE ALL':
                # Delete all users
                print("\n🗑️ Deleting all users...")
                delete_result = db_service.supabase.table('users').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                
                print(f"✅ Deleted {len(delete_result.data)} users successfully!")
                
                # Verify deletion
                verify_result = db_service.supabase.table('users').select('*').execute()
                remaining_users = verify_result.data
                
                if not remaining_users:
                    print("✅ Database is now completely empty!")
                    print("🎉 Ready for fresh start - you can sign in again!")
                else:
                    print(f"⚠️ {len(remaining_users)} users still remain in database")
            else:
                print("❌ Deletion cancelled")
        else:
            print("📊 No users found in database - already empty!")
        
    except Exception as e:
        print(f"❌ Error deleting users: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(delete_all_users()) 