import aiohttp
import asyncio
import uuid
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from app.shared.config import config

class DatabaseService:
    """
    Industry-grade Supabase Service Layer.
    Centralizes connection logic, error handling, and common CRUD operations.
    """
   
    def __init__(self):
        self.base_url = f"{config.settings.supabase_url}/rest/v1" if config.settings.supabase_url else ""
        self.headers = {
            "apikey": config.settings.supabase_service_key or "",
            "Authorization": f"Bearer {config.settings.supabase_service_key or ''}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"  # Ask Supabase to return the modified/created object
        }
        self.timeout = aiohttp.ClientTimeout(total=10)
        
        # Debug connection info (safely)
        if not self.base_url or "your_supabase" in self.base_url:
            print(f"⚠️  WARNING: Invalid Supabase URL: {self.base_url}")
        else:
            print(f"✅ Supabase connected to: {self.base_url.split('.supabase.co')[0]}...")
            
            # CRITICAL DEBUG: Check key role
            try:
                import jwt
                key = config.settings.supabase_service_key
                if key:
                    decoded = jwt.decode(key, options={"verify_signature": False})
                    print(f"🔑 Key Role: {decoded.get('role', 'unknown')}")
                    if decoded.get('role') != 'service_role':
                         print("⚠️  WARNING: You are using the ANON key! You MUST use the SERVICE_ROLE key.")
            except Exception as e:
                print(f"⚠️  Could not decode key: {e}")

    # =========================================================================
    # CORE ENGINE (The "One Function to Rule Them All")
    # =========================================================================

    async def _request(self, method: str, endpoint: str, params: Dict = None, json_data: Dict = None) -> Any:
        """
        Unified request handler. Handles connection, auth, headers, and basic error parsing.
        """
        if not self.base_url or "your_supabase" in self.base_url:
            print("❌ Error: Supabase URL not configured")
            return None

        url = f"{self.base_url}/{endpoint}"
        
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.request(method, url, headers=self.headers, params=params, json=json_data) as resp:
                    if resp.status in [200, 201, 204]:
                        # ALWAYS try to parse JSON (Supabase returns [] for empty results)
                        try:
                            result = await resp.json()
                            return result
                        except:
                            return True  # Fallback for truly empty responses
                    elif resp.status == 409: # Conflict
                        return "CONFLICT"
                    
                    # Log error for non-success status
                    error_text = await resp.text()
                    print(f"❌ Supabase Request Failed: {method} {url} -> {resp.status} : {error_text}")
                    return None
        except Exception as e:
            print(f"❌ Supabase Connection Error: {e}")
            return None

    # =========================================================================
    # DATA PRIMITIVES (CRUD wrappers)
    # =========================================================================

    async def _get(self, table: str, query: Dict) -> Optional[Dict]:
        """Generic GET single record."""
        # Supabase syntax: ?email=eq.value
        params = {k: f"eq.{v}" for k, v in query.items()}
        params["select"] = "*"
        data = await self._request("GET", table, params=params)
        
        # Handle the response
        if isinstance(data, list):
            if len(data) > 0:
                print(f"✅ _get({table}) -> Found: {data[0].get('email', 'unknown')}")
                return data[0]
            else:
                print(f"🔎 _get({table}) -> Empty (user not in DB)")
                return None
        else:
            print(f"⚠️ _get({table}) -> Unexpected: {type(data).__name__}")
            return None

    async def _update(self, table: str, query: Dict, data: Dict) -> bool:
        """Generic UPDATE record."""
        params = {k: f"eq.{v}" for k, v in query.items()}
        res = await self._request("PATCH", table, params=params, json_data=data)
        return bool(res)

    async def _create(self, table: str, data: Dict) -> Any:
        """Generic CREATE record."""
        return await self._request("POST", table, json_data=data)

    # =========================================================================
    # PUBLIC BUSINESS LOGIC (Used by API endpoints)
    # =========================================================================

    async def get_or_create_user(self, email: str, user_data: Dict) -> Dict:
        """Get existing user or create a new one."""
        print(f"🔍 get_or_create_user: Looking for {email}")
        
        user = await self._get("users", {"email": email})
        if user: 
            print(f"✅ Found existing user: {email}")
            return user
        
        # Create new
        print(f"🆕 Creating new user: {email}")
        res = await self._create("users", user_data)
        print(f"📝 Create result: {type(res).__name__} = {res}")
        
        if res == "CONFLICT":
            print(f"⚠️ Conflict detected, fetching again...")
            return await self._get("users", {"email": email})
            
        # Handle list response from Supabase
        if isinstance(res, list) and len(res) > 0:
            print(f"✅ User created (list response)")
            return res[0]
            
        # Handle simple success (no body returned)
        if res is True:
            print(f"✅ User created (empty response), fetching...")
            return await self._get("users", {"email": email})

        if isinstance(res, dict):
            print(f"✅ User created (dict response)")
            return res
            
        print(f"❌ Failed to create user, res={res}")
        return None

    async def get_user_stats(self, email: str) -> Optional[Dict]:
        """Get user profile data."""
        return await self._get("users", {"email": email})

    async def increment_user_prompts(self, email: str) -> int:
        """Atomic-like increment of usage counters."""
        user = await self.get_user_stats(email)
        if not user:
            # Auto-create if missing
            await self.get_or_create_user(email, {"email": email, "name": "User"})
            return 1 # Assume 1st prompt

        # Logic: Reset daily limit if new day
        today = datetime.now().date().isoformat()
        last_reset = user.get("last_prompt_reset")
        daily_used = user.get("daily_prompts_used", 0)
        
        if last_reset != today:
            daily_used = 0
            last_reset = today

        # Update DB
        new_total = (user.get("enhanced_prompts", 0) or 0) + 1
        
        success = await self._update("users", {"email": email}, {
            "enhanced_prompts": new_total,
            "daily_prompts_used": daily_used + 1,
            "last_prompt_reset": last_reset
        })
        
        return new_total if success else 0

    # Backward compatibility helper for internal calls
    async def get_user_by_email(self, email: str):
        return await self.get_user_stats(email)
    
    async def create_user(self, data: Dict):
        return await self._create("users", data)

# Global Instance
database_service = DatabaseService()
db_service = database_service