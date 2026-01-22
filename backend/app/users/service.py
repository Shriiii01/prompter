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

    # =========================================================================
    # CORE ENGINE (The "One Function to Rule Them All")
    # =========================================================================

    async def _request(self, method: str, endpoint: str, params: Dict = None, json_data: Dict = None) -> Any:
        """
        Unified request handler. Handles connection, auth, headers, and basic error parsing.
        """
        if not self.base_url or "your_supabase" in self.base_url:
            return None

        url = f"{self.base_url}/{endpoint}"
        
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.request(method, url, headers=self.headers, params=params, json=json_data) as resp:
                    if resp.status in [200, 201, 204]:
                        # Return JSON if content exists, else True
                        return await resp.json() if resp.content_length else True
                    elif resp.status == 409: # Conflict
                        return "CONFLICT"
                    return None
        except Exception as e:
            print(f"Supabase request error: {e}")
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
        return data[0] if data and isinstance(data, list) else None

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
        user = await self._get("users", {"email": email})
        if user: 
            return user
        
        # Create new
        res = await self._create("users", user_data)
        if res == "CONFLICT": # Race condition handling
            return await self._get("users", {"email": email}) or user_data
            
        # Handle list response from Supabase
        if isinstance(res, list) and len(res) > 0:
            return res[0]
            
        return res if isinstance(res, dict) else user_data

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

    async def check_user_subscription_status(self, email: str) -> Dict:
        """Check status and auto-downgrade if expired."""
        user = await self.get_user_stats(email)
        if not user: 
            return {"subscription_tier": "free", "daily_prompts_used": 0, "daily_limit": 999999}

        tier = user.get("subscription_tier", "free")
        expires = user.get("subscription_expires_at")

        # Expiry Check
        if tier == "pro" and expires:
            try:
                exp_date = datetime.fromisoformat(expires.replace('Z', '+00:00'))
                if exp_date < datetime.utcnow().replace(tzinfo=exp_date.tzinfo):
                    # Expired -> Downgrade logic inline
                    await self._update("users", {"email": email}, {
                        "subscription_tier": "free",
                        "subscription_expires_at": None,
                        "daily_prompts_used": 0,
                        "last_prompt_reset": datetime.utcnow().date().isoformat()
                    })
                    tier = "free"
            except: pass

        return {
            "subscription_tier": tier,
            "daily_prompts_used": user.get("daily_prompts_used", 0),
            "daily_limit": 999999,
            "subscription_expires": expires
        }

    async def upgrade_user_to_pro(self, email: str) -> bool:
        """Enable Pro tier for 30 days."""
        expiry = (datetime.utcnow() + timedelta(days=30)).isoformat()
        return await self._update("users", {"email": email}, {
            "subscription_tier": "pro",
            "subscription_expires_at": expiry
        })

    # Backward compatibility helper for internal calls
    async def get_user_by_email(self, email: str):
        return await self.get_user_stats(email)
    
    async def create_user(self, data: Dict):
        return await self._create("users", data)

# Global Instance
database_service = DatabaseService()
db_service = database_service