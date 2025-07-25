#!/usr/bin/env python3
"""
Simple script to reset database without user input
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

async def reset_database():
    """Reset all user data and counts"""
    print("🗑️ Resetting Database...")
    
    try:
        # Initialize database connection
        db_service._init_supabase()
        
        # Clear all user data
        print("🧹 Clearing all user data...")
        delete_result = db_service.supabase.table('users').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        
        print(f"✅ Deleted {len(delete_result.data)} user records")
        print("✅ Database reset successfully!")
        
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
    
    finally:
        # Cleanup
        await db_service.close()

if __name__ == "__main__":
    asyncio.run(reset_database()) 