#!/usr/bin/env python3
"""
Database Status Checker
Checks what tables exist in the Supabase database
"""

import asyncio
import aiohttp
import json
from app.core.config import config

async def check_database_status():
    """Check database status and list tables"""
    
    supabase_url = config.settings.supabase_url
    supabase_key = config.settings.supabase_service_key
    
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    
    print("🔍 Checking database status...")
    print(f"URL: {supabase_url}")
    print(f"Key configured: {'✅' if supabase_key and supabase_key != 'your_supabase_service_key_here' else '❌'}")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test basic connection
            async with session.get(f"{supabase_url}/rest/v1/", headers=headers) as response:
                print(f"Connection test: {'✅' if response.status == 200 else '❌'} ({response.status})")
                
                if response.status == 200:
                    print("✅ Database connection successful!")
                else:
                    print(f"❌ Database connection failed: {response.status}")
                    return
            
            # Check what tables exist by trying to query them
            tables_to_check = ['users', 'enhancement_events', 'enhancement_usage']
            
            print("\n📊 Checking tables:")
            for table in tables_to_check:
                try:
                    async with session.get(f"{supabase_url}/rest/v1/{table}?limit=1", headers=headers) as response:
                        if response.status == 200:
                            print(f"✅ {table} - EXISTS")
                        elif response.status == 404:
                            print(f"❌ {table} - NOT FOUND")
                        else:
                            print(f"⚠️ {table} - ERROR ({response.status})")
                except Exception as e:
                    print(f"❌ {table} - ERROR: {str(e)}")
            
            # Try to get user count
            print("\n👥 Checking user data:")
            try:
                async with session.get(f"{supabase_url}/rest/v1/users?select=count", headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Users table accessible - {len(data)} users found")
                    else:
                        print(f"❌ Users table error: {response.status}")
            except Exception as e:
                print(f"❌ Users table error: {str(e)}")
                
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_database_status())
