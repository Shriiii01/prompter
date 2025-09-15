#!/usr/bin/env python3
"""
Database Setup Script
Helps you set up a new Supabase database with the minimal required schema
"""

import os
import re
import asyncio
import aiohttp

def update_env_file(new_url, new_key):
    """Update the .env file with new Supabase credentials"""
    
    env_file = '.env'
    
    if not os.path.exists(env_file):
        print("❌ .env file not found!")
        return False
    
    # Read current .env file
    with open(env_file, 'r') as f:
        content = f.read()
    
    # Update SUPABASE_URL
    content = re.sub(
        r'SUPABASE_URL=.*',
        f'SUPABASE_URL={new_url}',
        content
    )
    
    # Update SUPABASE_SERVICE_KEY
    content = re.sub(
        r'SUPABASE_SERVICE_KEY=.*',
        f'SUPABASE_SERVICE_KEY={new_key}',
        content
    )
    
    # Write back to .env file
    with open(env_file, 'w') as f:
        f.write(content)
    
    print("✅ .env file updated successfully!")
    return True

async def test_connection(url, key):
    """Test the database connection"""
    
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{url}/rest/v1/", headers=headers) as response:
                if response.status == 200:
                    print("✅ Database connection successful!")
                    return True
                else:
                    print(f"❌ Database connection failed: {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Connection test failed: {str(e)}")
        return False

def main():
    print("🔧 Database Setup for AI Magic Prompt Enhancer")
    print("=" * 50)
    print()
    print("Your current Supabase project appears to be deleted.")
    print("Let's create a new one with the minimal required schema.")
    print()
    print("Steps:")
    print("1. Go to https://supabase.com")
    print("2. Create a new project")
    print("3. Get the Project URL and service_role key")
    print("4. Enter them below")
    print()
    
    new_url = input("Enter new Supabase URL (e.g., https://xxxxxxxxxxxxx.supabase.co): ").strip()
    new_key = input("Enter new service_role key (starts with eyJ...): ").strip()
    
    if not new_url or not new_key:
        print("❌ Both URL and key are required!")
        return
    
    if not new_url.startswith('https://') or not new_url.endswith('.supabase.co'):
        print("❌ Invalid Supabase URL format!")
        return
    
    if not new_key.startswith('eyJ'):
        print("❌ Invalid service_role key format!")
        return
    
    print()
    print("Testing connection...")
    
    # Test connection
    if not asyncio.run(test_connection(new_url, new_key)):
        print("❌ Cannot connect to the database. Please check your credentials.")
        return
    
    print()
    print("Updating .env file...")
    
    if update_env_file(new_url, new_key):
        print()
        print("✅ Configuration updated!")
        print()
        print("Next steps:")
        print("1. Go to your Supabase dashboard")
        print("2. Go to SQL Editor")
        print("3. Copy and paste the contents of 'correct_schema.sql'")
        print("4. Run the SQL to create the tables")
        print("5. Restart the backend: python main.py")
        print("6. Test the connection")
        print()
        print("The correct schema includes ALL tables your code expects:")
        print("- user_stats table (older database service)")
        print("- enhancement_logs table (older database service)")
        print("- users table (newer API endpoints)")
        print("- enhancement_events table (newer schema)")
        print("- enhancement_usage table (newer schema)")
        print("- Simple increment function")
        print()
        print("This covers BOTH old and new code paths - nothing will crash!")
    else:
        print("❌ Failed to update configuration!")

if __name__ == "__main__":
    main()
