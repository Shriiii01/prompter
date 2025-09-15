#!/usr/bin/env python3
"""
Simple Database Status Checker
Uses existing database service to check status
"""

import asyncio
from app.utils.database import db_service

async def check_database():
    """Check database using existing service"""
    
    print("🔍 Checking database using existing service...")
    
    try:
        # Test if database is configured
        is_configured = db_service._is_configured()
        print(f"Database configured: {'✅' if is_configured else '❌'}")
        
        if not is_configured:
            print("❌ Database not properly configured")
            return
        
        # Test connection
        print("Testing connection...")
        await db_service._test_connection()
        print("✅ Database connection successful!")
        
        # Try to get a user to test table access
        print("Testing users table...")
        try:
            # This will test if the users table exists and is accessible
            test_user = await db_service.get_user_by_email("test@example.com")
            print("✅ Users table is accessible")
        except Exception as e:
            print(f"❌ Users table error: {str(e)}")
            
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_database())
