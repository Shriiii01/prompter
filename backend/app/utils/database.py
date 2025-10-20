import logging
import asyncio
import time
import uuid
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import aiohttp
import json

from ..core.config import config

logger = logging.getLogger(__name__)

class DatabaseService:
    """Enhanced Supabase database service with connection management and health checks."""
    
    def __init__(self):
        self.supabase_url = config.settings.supabase_url
        self.supabase_key = config.settings.supabase_service_key
        self.session = None
        self.connection_pool = []
        self.max_retries = 3
        self.retry_delay = 1
        
    async def initialize(self):
        """Initialize database connection."""
        if not self._is_configured():
            logger.warning("Database not configured - some features will be disabled")
            return False
        
        try:
            # Test connection
            await self._test_connection()
            logger.info("Database connection established successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            return False
    
    def _is_configured(self) -> bool:
        """Check if database is properly configured."""
        return (self.supabase_url and 
                self.supabase_url != "your_supabase_url_here" and
                self.supabase_key and 
                self.supabase_key != "your_supabase_service_key_here")
    
    async def _test_connection(self):
        """Test database connection."""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.supabase_url}/rest/v1/",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status != 200:
                    raise Exception(f"Database connection failed: {response.status}")
    
    async def _execute_with_retry(self, operation, *args, **kwargs):
        """Execute database operation with retry logic."""
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                return await operation(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                    logger.warning(f"Database operation failed, retrying... (attempt {attempt + 1})")
        
        raise last_exception
    
    async def get_user_prompt_count(self, user_id: str) -> int:
        """Get user's prompt enhancement count."""
        if not self._is_configured():
            return 0
        
        try:
            return await self._execute_with_retry(self._get_user_count, user_id)
        except Exception as e:
            logger.error(f"Failed to get user prompt count: {str(e)}")
            return 0
    
    async def _get_user_count(self, user_id: str) -> int:
        """Internal method to get user count from database."""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        params = {
            "user_id": f"eq.{user_id}",
            "select": "prompt_count"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.supabase_url}/rest/v1/user_stats",
                headers=headers,
                params=params,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if data:
                        return data[0].get("prompt_count", 0)
                    else:
                        # User doesn't exist, create record
                        await self._create_user_record(user_id)
                        return 0
                else:
                    raise Exception(f"Database query failed: {response.status}")
    async def increment_user_prompt_count(self, user_id: str) -> int:
        """Increment user's prompt count and return new count."""
        if not self._is_configured():
            return 0
        
        try:
            return await self._execute_with_retry(self._increment_user_count, user_id)
        except Exception as e:
            logger.error(f"Failed to increment user prompt count: {str(e)}")
            return 0
    
    async def _increment_user_count(self, user_id: str) -> int:
        """Internal method to increment user count in database."""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        # First, try to update existing record
        data = {
            "prompt_count": "prompt_count + 1",
            "last_updated": datetime.utcnow().isoformat()
        }
        
        params = {
            "user_id": f"eq.{user_id}"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.patch(
                f"{self.supabase_url}/rest/v1/user_stats",
                headers=headers,
                json=data,
                params=params,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    # Get updated count
                    return await self._get_user_count(user_id)
                elif response.status == 404:
                    # User doesn't exist, create new record
                    await self._create_user_record(user_id)
                    return 1
                else:
                    raise Exception(f"Database update failed: {response.status}")
    
    async def _create_user_record(self, user_id: str):
        """Create new user record in database."""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "user_id": user_id,
            "prompt_count": 1,
            "created_at": datetime.utcnow().isoformat(),
            "last_updated": datetime.utcnow().isoformat()
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.supabase_url}/rest/v1/user_stats",
                headers=headers,
                json=data,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status != 201:
                    raise Exception(f"Failed to create user record: {response.status}")
    
    async def log_enhancement_request(self, user_id: str, original_prompt: str, 
                                    enhanced_prompt: str, provider: str, target_model: str):
        """Log enhancement request for analytics."""
        if not self._is_configured():
            return
        
        try:
            await self._execute_with_retry(self._log_request, user_id, original_prompt, 
                                         enhanced_prompt, provider, target_model)
        except Exception as e:
            logger.error(f"Failed to log enhancement request: {str(e)}")
    
    async def _log_request(self, user_id: str, original_prompt: str, 
                          enhanced_prompt: str, provider: str, target_model: str):
        """Internal method to log request in database."""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "user_id": user_id,
            "original_prompt": original_prompt,
            "enhanced_prompt": enhanced_prompt,
            "provider": provider,
            "target_model": target_model,
            "created_at": datetime.utcnow().isoformat()
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.supabase_url}/rest/v1/enhancement_logs",
                headers=headers,
                json=data,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status != 201:
                    raise Exception(f"Failed to log request: {response.status}")
    
    async def get_system_stats(self) -> Dict:
        """Get system-wide statistics."""
        if not self._is_configured():
            return {"error": "Database not configured"}
        
        try:
            return await self._execute_with_retry(self._get_stats)
        except Exception as e:
            logger.error(f"Failed to get system stats: {str(e)}")
            return {"error": str(e)}
    
    async def _get_stats(self) -> Dict:
        """Internal method to get system statistics."""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        # Get total users
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.supabase_url}/rest/v1/user_stats?select=count",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    user_count = len(await response.json())
                else:
                    user_count = 0
            
            # Get total enhancements
            async with session.get(
                f"{self.supabase_url}/rest/v1/enhancement_logs?select=count",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    enhancement_count = len(await response.json())
                else:
                    enhancement_count = 0
        
        return {
            "total_users": user_count,
            "total_enhancements": enhancement_count,
            "database_status": "connected"
        }
    
    async def health_check(self) -> Dict:
        """Perform comprehensive database health check."""
        if not self._is_configured():
            return {
                "status": "not_configured",
                "error": "Database not configured"
            }
        
        try:
            start_time = time.time()
            
            # Test basic connectivity
            await self._test_connection()
            connection_time = time.time() - start_time
            
            # Test table existence and basic operations
            stats = await self.get_system_stats()
            
            return {
                "status": "healthy",
                "connection_time": connection_time,
                "tables_accessible": "user_stats" in str(stats) and "enhancement_logs" in str(stats),
                "stats": stats
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "connection_time": None
            }
    
    async def cleanup_old_logs(self, days: int = 30):
        """Clean up old enhancement logs."""
        if not self._is_configured():
            return
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }
            
            params = {
                "created_at": f"lt.{cutoff_date.isoformat()}"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.delete(
                    f"{self.supabase_url}/rest/v1/enhancement_logs",
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        logger.info(f"Cleaned up logs older than {days} days")
                    else:
                        logger.warning(f"Failed to cleanup logs: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

    # User management methods
    async def create_user(self, user_data: Dict) -> Dict:
        """Create a new user in the database."""
        if not self._is_configured():
            return user_data
        
        try:
            return await self._execute_with_retry(self._create_user, user_data)
        except Exception as e:
            logger.error(f"Failed to create user: {str(e)}")
            return user_data
    
    async def _create_user(self, user_data: Dict) -> Dict:
        """Internal method to create user in database."""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        # Keep name field since database now has it
        db_data = user_data
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.supabase_url}/rest/v1/users",
                headers=headers,
                json=db_data
            ) as response:
                if response.status == 201:
                    return await response.json()
                elif response.status == 409:  # User already exists
                    # Get existing user
                    return await self.get_user_by_email(user_data["email"])
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to create user: {response.status} - {error_text}")
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email address."""
        if not self._is_configured():
            return None
        
        try:
            return await self._execute_with_retry(self._get_user_by_email, email)
        except Exception as e:
            logger.error(f"Failed to get user by email: {str(e)}")
            return None
    
    async def _get_user_by_email(self, email: str) -> Optional[Dict]:
        """Internal method to get user by email from database."""
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json"
        }
        
        params = {
            "email": f"eq.{email}",
            "select": "*"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{self.supabase_url}/rest/v1/users",
                headers=headers,
                params=params
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data[0] if data else None
                else:
                    raise Exception(f"Failed to get user: {response.status}")
    # ADD THESE METHODS RIGHT HERE (around line 412)
    
    async def get_user_stats(self, email: str) -> Optional[Dict]:
        """Get user stats by email - matches what user endpoints need."""
        try:
            user = await self.get_user_by_email(email)
            if user:
                return {
                    "id": user.get("id"),
                    "email": user.get("email"),
                    "name": user.get("name") or "User",  # Ensure name is never None
                    "enhanced_prompts": user.get("enhanced_prompts", 0),
                    "created_at": user.get("created_at")
                }
            return None
        except Exception as e:
            logger.error(f"Error getting user stats: {str(e)}")
            return None

    async def get_or_create_user(self, email: str, user_data: Dict) -> Dict:
        """Get existing user or create new one - matches what user endpoints need."""
        try:
            # First try to get existing user
            existing_user = await self.get_user_by_email(email)
            if existing_user:
                return existing_user
            
            # If no existing user, create new one
            new_user = await self.create_user(user_data)
            return new_user
        except Exception as e:
            logger.error(f"Error in get_or_create_user: {str(e)}")
            # Return user_data with required fields as fallback
            return {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": user_data.get("name") or "User",  # Ensure name is never None
                "enhanced_prompts": user_data.get("enhanced_prompts", 0),
                "created_at": datetime.utcnow().isoformat()
            }

    async def record_enhancement_atomic(self, email: str, idempotency_key: str, platform: str = 'chatgpt') -> Dict:
        """Record enhancement with idempotency using RPC function."""
        if not self._is_configured():
            return {"enhanced_prompts": 0, "daily_prompts_used": 0, "subscription_tier": "free", "limit_reached": False}
        
        try:
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }
            
            data = {
                "p_event_id": idempotency_key,
                "p_email": email,
                "p_platform": platform
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.supabase_url}/rest/v1/rpc/record_enhancement_v3",
                    headers=headers,
                    json=data,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        if result and len(result) > 0:
                            # Map the new column names to the expected format
                            rpc_result = result[0]
                            return {
                                "enhanced_prompts": rpc_result.get("total_prompts", 0),
                                "daily_prompts_used": rpc_result.get("daily_used", 0),
                                "subscription_tier": rpc_result.get("user_tier", "free"),
                                "limit_reached": rpc_result.get("limit_reached", False)
                            }
                        else:
                            return {"enhanced_prompts": 0, "daily_prompts_used": 0, "subscription_tier": "free", "limit_reached": False}
                    else:
                        logger.error(f"RPC call failed: {response.status}")
                        return {"enhanced_prompts": 0, "daily_prompts_used": 0, "subscription_tier": "free", "limit_reached": False}
        except Exception as e:
            logger.error(f"Error in record_enhancement_atomic: {str(e)}")
            return {"enhanced_prompts": 0, "daily_prompts_used": 0, "subscription_tier": "free", "limit_reached": False}

    # Platform usage is now tracked in users table via platform_*_count columns
    # No need for separate enhancement_usage table

    async def check_user_subscription_status(self, email: str) -> Dict:
        """Check user's subscription status and handle expiry."""
        if not self._is_configured():
                return {"subscription_tier": "free", "daily_prompts_used": 0, "daily_limit": 10, "subscription_expires": None}
        
        try:
            user = await self.get_user_by_email(email)
            if user:
                subscription_tier = user.get("subscription_tier", "free")
                subscription_expires = user.get("subscription_expires_at")
                
                # Check if pro subscription has expired
                if subscription_tier == "pro" and subscription_expires:
                    from datetime import datetime
                    try:
                        expiry_date = datetime.fromisoformat(subscription_expires.replace('Z', '+00:00'))
                        if expiry_date < datetime.utcnow().replace(tzinfo=expiry_date.tzinfo):
                            # Subscription expired - downgrade to free
                            logger.info(f"Pro subscription expired for {email}, downgrading to free")
                            await self._downgrade_to_free(email)
                            subscription_tier = "free"
                    except Exception as e:
                        logger.error(f"Error parsing expiry date for {email}: {e}")
                
                return {
                    "subscription_tier": subscription_tier,
                    "daily_prompts_used": user.get("daily_prompts_used", 0),
                    "daily_limit": 10 if subscription_tier == "free" else None,
                    "subscription_expires": subscription_expires
                }
            else:
                return {"subscription_tier": "free", "daily_prompts_used": 0, "daily_limit": 10, "subscription_expires": None}
        except Exception as e:
            logger.error(f"Error checking subscription status: {str(e)}")
            return {"subscription_tier": "free", "daily_prompts_used": 0, "daily_limit": 10, "subscription_expires": None}

    async def _downgrade_to_free(self, email: str) -> bool:
        """Downgrade user from pro to free subscription."""
        if not self._is_configured():
            return False
        
        try:
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }
            
            # Downgrade to free tier
            data = {
                "subscription_tier": "free",
                "subscription_expires_at": None,
                "daily_prompts_used": 0,  # Reset daily counter
                "last_prompt_reset": datetime.utcnow().date().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{self.supabase_url}/rest/v1/users",
                    headers=headers,
                    json=data,
                    params={"email": f"eq.{email}"},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info(f"User {email} downgraded to free tier")
                        return True
                    else:
                        logger.error(f"Failed to downgrade user: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"Error downgrading user to free: {str(e)}")
            return False

    async def upgrade_user_to_pro(self, email: str) -> bool:
        """Upgrade user to pro subscription."""
        if not self._is_configured():
            return False
        
        try:
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }
            
            # Set subscription to pro with 30 days expiry
            data = {
                "subscription_tier": "pro",
                "subscription_expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{self.supabase_url}/rest/v1/users",
                    headers=headers,
                    json=data,
                    params={"email": f"eq.{email}"},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        logger.info(f"User {email} upgraded to pro")
                        return True
                    else:
                        logger.error(f"Failed to upgrade user: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"Error upgrading user to pro: {str(e)}")
            return False

    async def get_user_count_only(self, email: str) -> int:
        """Get user's prompt count only."""
        try:
            user = await self.get_user_by_email(email)
            if user:
                return user.get("enhanced_prompts", 0)
            return 0
        except Exception as e:
            logger.error(f"Error getting user count: {str(e)}")
            return 0

    async def increment_user_prompts(self, email: str) -> int:
        """Increment user's prompt count and return new count."""
        logger.info(f" DATABASE: increment_user_prompts called with email: {email}")
        logger.info(f" DATABASE: email type: {type(email)}, length: {len(email) if email else 0}")

        if not self._is_configured():
            logger.error(" DATABASE: Database not configured!")
            return 0

        try:
            # Try the atomic RPC function first
            logger.info(f" DATABASE: About to call record_enhancement_atomic")
            result = await self.record_enhancement_atomic(email, str(uuid.uuid4()), "chatgpt")
            new_count = result.get("enhanced_prompts", 0)
            logger.info(f" DATABASE: RPC result: {result}")
            logger.info(f" DATABASE: New count from RPC: {new_count}")

            # If RPC failed (returns 0), use fallback direct update
            if new_count == 0:
                logger.warning("RPC function failed, using direct database update as fallback")
                return await self._increment_user_prompts_fallback(email)

            return new_count
        except Exception as e:
            logger.error(f"Error incrementing user prompts: {str(e)}")
            # Fallback to direct database update
            try:
                return await self._increment_user_prompts_fallback(email)
            except Exception as fallback_e:
                logger.error(f"Fallback increment also failed: {fallback_e}")
                return 0

    async def _increment_user_prompts_fallback(self, email: str) -> int:
        """Fallback method to increment user prompts using direct database operations."""
        if not self._is_configured():
            return 0

        try:
            headers = {
                "apikey": self.supabase_key,
                "Authorization": f"Bearer {self.supabase_key}",
                "Content-Type": "application/json"
            }

            # First, get current user data
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.supabase_url}/rest/v1/users?email=eq.{email}&select=enhanced_prompts,daily_prompts_used,last_prompt_reset,subscription_tier",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        user_data = await response.json()
                        if not user_data:
                            # User doesn't exist, create them
                            user_payload = {
                                "email": email,
                                "enhanced_prompts": 1,
                                "daily_prompts_used": 1,
                                "subscription_tier": "free",
                                "last_prompt_reset": datetime.now().date().isoformat()
                            }

                            async with session.post(
                                f"{self.supabase_url}/rest/v1/users",
                                headers=headers,
                                json=user_payload,
                                timeout=aiohttp.ClientTimeout(total=5)
                            ) as create_response:
                                if create_response.status in [200, 201]:
                                    logger.info(f"Created new user: {email}")
                                    return 1
                                else:
                                    logger.error(f"Failed to create user: {create_response.status}")
                                    return 0

                        # User exists, update their counts
                        current = user_data[0]
                        current_prompts = current.get("enhanced_prompts", 0) or 0
                        current_daily = current.get("daily_prompts_used", 0) or 0
                        last_reset = current.get("last_prompt_reset")
                        tier = current.get("subscription_tier", "free")

                        # Reset daily counter if needed
                        today = datetime.now().date()
                        if not last_reset:
                            # No last reset, set to today
                            last_reset = today
                            current_daily = 0
                        else:
                            # Parse the last reset date
                            try:
                                if isinstance(last_reset, str):
                                    last_reset_date = datetime.fromisoformat(last_reset.split('T')[0]).date()
                                else:
                                    last_reset_date = last_reset
                            except:
                                last_reset_date = today
                                current_daily = 0

                            if last_reset_date != today:
                                current_daily = 0
                                last_reset = today

                        # Check daily limit for free users
                        if tier == "free" and current_daily >= 10:
                            logger.warning(f"Free user {email} reached daily limit")
                            return current_prompts

                        # Increment counters
                        new_prompts = current_prompts + 1
                        new_daily = current_daily + 1

                        update_payload = {
                            "enhanced_prompts": new_prompts,
                            "daily_prompts_used": new_daily,
                            "last_prompt_reset": last_reset.isoformat() if hasattr(last_reset, 'isoformat') else str(last_reset)
                        }

                        async with session.patch(
                            f"{self.supabase_url}/rest/v1/users?email=eq.{email}",
                            headers=headers,
                            json=update_payload,
                            timeout=aiohttp.ClientTimeout(total=5)
                        ) as update_response:
                            if update_response.status == 200:
                                logger.info(f"Updated user {email}: prompts={new_prompts}, daily={new_daily}")
                                return new_prompts
                            else:
                                error_text = await update_response.text()
                                logger.error(f"Failed to update user: {update_response.status} - {error_text}")
                                return 0
                    else:
                        logger.error(f"Failed to get user data: {response.status}")
                        return 0

        except Exception as e:
            logger.error(f"Fallback increment error: {str(e)}")
            return 0

# Global database service instance
database_service = DatabaseService()

# Alias for backward compatibility
db_service = database_service 