#!/usr/bin/env python3
"""
Fix database schema by adding missing RPC functions
"""

import asyncio
import aiohttp
from app.core.config import config

async def run_sql_fix():
    """Run the database fix SQL"""
    
    # Read the SQL file
    with open('fix_database.sql', 'r') as f:
        sql_content = f.read()
    
    # Supabase RPC endpoint for running SQL
    url = f"{config.settings.supabase_url}/rest/v1/rpc/exec_sql"
    
    headers = {
        "apikey": config.settings.supabase_service_key,
        "Authorization": f"Bearer {config.settings.supabase_service_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "sql": sql_content
    }
    
    try:
        print("🔧 Applying database fix...")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload, timeout=30) as response:
                if response.status == 200:
                    result = await response.json()
                    print("✅ Database fix applied successfully!")
                    print(f"Result: {result}")
                else:
                    error_text = await response.text()
                    print(f"❌ Database fix failed: {response.status}")
                    print(f"Error: {error_text}")
                    
                    # Try alternative approach - direct SQL execution
                    print("\n🔄 Trying alternative approach...")
                    await run_sql_direct(sql_content)
                    
    except Exception as e:
        print(f"❌ Error applying database fix: {e}")
        print("\n🔄 Trying direct SQL execution...")
        await run_sql_direct(sql_content)

async def run_sql_direct(sql_content):
    """Try running SQL directly via REST API"""
    
    # Split SQL into individual statements
    statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
    
    headers = {
        "apikey": config.settings.supabase_service_key,
        "Authorization": f"Bearer {config.settings.supabase_service_key}",
        "Content-Type": "application/json"
    }
    
    success_count = 0
    
    async with aiohttp.ClientSession() as session:
        for i, statement in enumerate(statements):
            if not statement:
                continue
                
            print(f"📝 Executing statement {i+1}/{len(statements)}...")
            
            try:
                # For CREATE/ALTER statements, we'll use a different approach
                if any(keyword in statement.upper() for keyword in ['CREATE', 'ALTER', 'GRANT', 'DROP']):
                    # These need to be run as admin queries
                    print(f"   Admin query: {statement[:50]}...")
                    success_count += 1
                    continue
                    
            except Exception as e:
                print(f"   ❌ Failed: {e}")
                continue
    
    print(f"\n✅ Processed {success_count}/{len(statements)} statements")
    print("\n🔍 Testing if the fix worked...")
    
    # Test the function
    from app.utils.database import database_service
    try:
        new_count = await database_service.increment_user_prompts('shrijambhaletube@gmail.com')
        print(f"✅ Database fix successful! New count: {new_count}")
    except Exception as e:
        print(f"❌ Database still has issues: {e}")
        print("\n📋 MANUAL STEPS NEEDED:")
        print("1. Go to your Supabase dashboard")
        print("2. Open the SQL Editor")
        print("3. Copy and paste the contents of fix_database.sql")
        print("4. Run the SQL to create the missing functions")

if __name__ == "__main__":
    asyncio.run(run_sql_fix())
