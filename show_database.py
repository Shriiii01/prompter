#!/usr/bin/env python3
"""
Script to show all current data in the database
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

async def show_database():
    """Show all current data in the database"""
    print("📊 Current Database Contents:")
    print("=" * 50)
    
    try:
        # Initialize database connection
        db_service._init_supabase()
        
        # Get all users
        result = db_service.supabase.table('users').select('*').execute()
        users = result.data
        
        if users:
            print(f"Found {len(users)} users in database:\n")
            
            for i, user in enumerate(users, 1):
                print(f"User {i}:")
                print(f"  ID: {user['id']}")
                print(f"  Email: {user['email']}")
                print(f"  Name: {user.get('name', 'Not set')}")
                print(f"  Enhanced Prompts: {user.get('enhanced_prompts', 0)}")
                print(f"  Created At: {user.get('created_at', 'Unknown')}")
                print("-" * 30)
        else:
            print("No users found in database")
        
        # Show summary
        if users:
            total_prompts = sum(user.get('enhanced_prompts', 0) for user in users)
            users_with_names = sum(1 for user in users if user.get('name'))
            users_without_names = len(users) - users_with_names
            
            print(f"\n📈 Summary:")
            print(f"  Total Users: {len(users)}")
            print(f"  Total Enhanced Prompts: {total_prompts}")
            print(f"  Users with names: {users_with_names}")
            print(f"  Users without names: {users_without_names}")
            print(f"  Average prompts per user: {total_prompts/len(users):.1f}")
        
    except Exception as e:
        print(f"❌ Error reading database: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(show_database()) 