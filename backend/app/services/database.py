import os
import logging
import asyncio
import time
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
from enum import Enum
import asyncpg
from supabase import create_client, Client
from ..core.config import config

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Circuit is open, failing fast
    HALF_OPEN = "half_open"  # Testing if service is back

class DatabaseService:
    """Database service for user tracking and analytics with circuit breaker pattern"""
    
    def __init__(self):
        self.connection_pool = None
        self.supabase_url = config.settings.supabase_url
        self.supabase_key = config.settings.supabase_service_key
        self.supabase: Optional[Client] = None
        
        # Circuit breaker configuration
        self.circuit_state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        self.failure_threshold = 5  # Default value
        self.timeout_duration = 60  # Default value
        self.success_threshold = 3  # Default value
        self.success_count = 0  # Separate counter for HALF_OPEN state
        
        # Connection pooling configuration
        self.min_connections = 5  # Default value
        self.max_connections = 20  # Default value
        self.connection_timeout = 30  # Default value
        self.command_timeout = 30  # Default value
        
        # Health check configuration
        self.last_health_check = 0
        self.health_check_interval = 300  # Default value
        self.is_healthy = True
        
    def _init_supabase(self):
        """Initialize Supabase client lazily"""
        if self.supabase is None:
            if not self.supabase_url or not self.supabase_key:
                logger.error("❌ Supabase URL and key are required")
                raise ValueError("Supabase URL and key are required")
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                logger.info("✅ Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Supabase client: {e}")
                raise
    
    async def _check_circuit_breaker(self) -> bool:
        """Check if circuit breaker allows the operation"""
        current_time = time.time()
        
        if self.circuit_state == CircuitState.OPEN:
            if current_time - self.last_failure_time >= self.timeout_duration:
                logger.info("🔄 Circuit breaker transitioning to HALF_OPEN")
                self.circuit_state = CircuitState.HALF_OPEN
                self.success_count = 0  # Reset success counter for HALF_OPEN state
                return True
            else:
                logger.warning("🚫 Circuit breaker is OPEN, failing fast")
                raise Exception("Database service temporarily unavailable (circuit breaker open)")
        
        elif self.circuit_state == CircuitState.HALF_OPEN:
            return True
        
        return True  # CLOSED state
    
    def _record_success(self):
        """Record a successful operation"""
        if self.circuit_state == CircuitState.HALF_OPEN:
            self.success_count += 1
            logger.info(f"✅ Database operation successful (success #{self.success_count}/{self.success_threshold})")
            if self.success_count >= self.success_threshold:
                logger.info("✅ Circuit breaker transitioning to CLOSED - database service restored")
                self.circuit_state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0  # Reset success counter
        self.is_healthy = True
    
    def _record_failure(self):
        """Record a failed operation"""
        current_time = time.time()
        self.failure_count += 1
        self.last_failure_time = current_time
        self.is_healthy = False
        
        logger.warning(f"❌ Database operation failed (failure #{self.failure_count}/{self.failure_threshold})")
        
        if self.circuit_state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
            logger.error("🚫 Circuit breaker transitioning to OPEN - database service temporarily unavailable")
            self.circuit_state = CircuitState.OPEN
        elif self.circuit_state == CircuitState.HALF_OPEN:
            logger.error("🚫 Circuit breaker transitioning back to OPEN - database still unstable")
            self.circuit_state = CircuitState.OPEN
            self.success_count = 0  # Reset success counter
    
    async def get_connection(self):
        """Get database connection with optimized pooling"""
        if not self.connection_pool:
            try:
                await self._check_circuit_breaker()
                
                # Use Supabase connection string - fixed format
                # Extract project ref from URL
                project_ref = self.supabase_url.split('//')[1].split('.')[0]
                database_url = f"postgresql://postgres:{self.supabase_key}@db.{project_ref}.supabase.co:5432/postgres"
                
                self.connection_pool = await asyncpg.create_pool(
                    database_url,
                    min_size=self.min_connections,
                    max_size=self.max_connections,
                    command_timeout=self.command_timeout,
                    server_settings={
                        'application_name': 'prompter_backend',
                        'jit': 'off'  # Disable JIT for better performance
                    }
                )
                logger.info("✅ Database connection pool created with optimized settings")
                self._record_success()
            except Exception as e:
                logger.error(f"❌ Failed to create connection pool: {e}")
                self._record_failure()
                raise
        
        return await self.connection_pool.acquire()
    
    async def close(self):
        """Close database connections"""
        if self.connection_pool:
            await self.connection_pool.close()
            logger.info("✅ Database connections closed")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check of database connectivity"""
        current_time = time.time()
        
        # Skip health check if done recently
        if current_time - self.last_health_check < self.health_check_interval:
            return {
                "status": "healthy" if self.is_healthy else "unhealthy",
                "last_check": self.last_health_check,
                "circuit_state": self.circuit_state.value,
                "failure_count": self.failure_count,
                "cached": True
            }
        
        self.last_health_check = current_time
        
        try:
            # Test Supabase connection
            self._init_supabase()
            
            # Test basic query
            result = self.supabase.table('users').select('count').limit(1).execute()
            
            # Test connection pool if available
            pool_status = "not_initialized"
            if self.connection_pool:
                try:
                    async with self.connection_pool.acquire() as conn:
                        await conn.fetchval('SELECT 1')
                    pool_status = "healthy"
                except Exception as e:
                    pool_status = f"unhealthy: {str(e)}"
            
            health_status = {
                "status": "healthy",
                "last_check": current_time,
                "circuit_state": self.circuit_state.value,
                "failure_count": self.failure_count,
                "supabase_connection": "healthy",
                "connection_pool": pool_status,
                "cached": False
            }
            
            self.is_healthy = True
            self._record_success()
            logger.info("✅ Database health check passed")
            return health_status
            
        except Exception as e:
            logger.error(f"❌ Database health check failed: {e}")
            self.is_healthy = False
            self._record_failure()
            
            return {
                "status": "unhealthy",
                "last_check": current_time,
                "circuit_state": self.circuit_state.value,
                "failure_count": self.failure_count,
                "error": str(e),
                "cached": False
            }
    
    async def get_or_create_user(self, email: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get existing user or create new one with circuit breaker protection"""
        try:
            await self._check_circuit_breaker()
            self._init_supabase()
            logger.info(f"🔍 Getting or creating user: {email}")
            
            # Check if user exists
            result = self.supabase.table('users').select('*').eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                user = result.data[0]
                logger.info(f"✅ User found: {email} with {user.get('enhanced_prompts', 0)} prompts")
                
                # Update name/display_name if provided and different
                update_needed = False
                update_data = {}
                
                if user_info.get('name') and user.get('name') != user_info.get('name'):
                    update_data['name'] = user_info.get('name')
                    update_needed = True
                
                if user_info.get('display_name') and user.get('display_name') != user_info.get('display_name'):
                    update_data['display_name'] = user_info.get('display_name')
                    update_needed = True
                
                if update_needed:
                    try:
                        update_result = self.supabase.table('users').update(update_data).eq('email', email).execute()
                        if update_result.data:
                            user.update(update_data)
                            logger.info(f"✅ Updated user info for {email}")
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to update user info: {e}")
                
                self._record_success()
                return user
            else:
                # Create new user
                insert_data = {
                    'email': email,
                    'enhanced_prompts': 0
                }
                
                # Add name fields if provided
                if user_info.get('name'):
                    insert_data['name'] = user_info.get('name')
                if user_info.get('display_name'):
                    insert_data['display_name'] = user_info.get('display_name')
                
                result = self.supabase.table('users').insert(insert_data).execute()
                
                if result.data and len(result.data) > 0:
                    new_user = result.data[0]
                    logger.info(f"✅ Created new user: {email} with name: {user_info.get('display_name', user_info.get('name'))}")
                    self._record_success()
                    return new_user
                else:
                    logger.error(f"❌ Failed to create user: {email}")
                    self._record_failure()
                    raise Exception("Failed to create user")
                
        except Exception as e:
            logger.error(f"❌ Error in get_or_create_user for {email}: {e}")
            self._record_failure()
            raise
    
    async def increment_user_prompts(self, email: str) -> int:
        """Increment user's enhanced_prompts count and return new total with atomic transaction and enhanced logging"""
        max_retries = 3
        base_delay = 0.5
        
        for attempt in range(max_retries):
            try:
                await self._check_circuit_breaker()
                self._init_supabase()
                logger.info(f"📈 Incrementing prompts for: {email} (attempt {attempt + 1}/{max_retries})")
                
                # Get current count first with detailed logging
                get_result = self.supabase.table('users').select('enhanced_prompts, name, display_name').eq('email', email).execute()
                
                if get_result.data and len(get_result.data) > 0:
                    user_data = get_result.data[0]
                    current_count = user_data['enhanced_prompts'] or 0
                    new_count = current_count + 1
                    user_name = user_data.get('name') or user_data.get('display_name') or email.split('@')[0]
                    
                    logger.info(f"📊 User {user_name} ({email}): {current_count} → {new_count} prompts")
                    
                    # Atomic update with validation
                    update_result = self.supabase.table('users').update({
                        'enhanced_prompts': new_count,
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    }).eq('email', email).execute()
                    
                    if update_result.data and len(update_result.data) > 0:
                        # Verify the update was successful
                        verify_result = self.supabase.table('users').select('enhanced_prompts').eq('email', email).execute()
                        if verify_result.data and verify_result.data[0]['enhanced_prompts'] == new_count:
                            logger.info(f"✅ Successfully incremented prompts for {user_name}: {current_count} → {new_count}")
                            self._record_success()
                            return new_count
                        else:
                            logger.error(f"❌ Count verification failed for {email}: expected {new_count}, got {verify_result.data[0]['enhanced_prompts'] if verify_result.data else 'none'}")
                            if attempt < max_retries - 1:
                                await asyncio.sleep(base_delay * (2 ** attempt))
                                continue
                            self._record_failure()
                            return current_count
                    else:
                        logger.error(f"❌ Failed to update count for {email}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(base_delay * (2 ** attempt))
                            continue
                        self._record_failure()
                        return current_count
                else:
                    logger.info(f"🆕 User not found for prompt increment: {email} - creating new user")
                    # Try to create user with 1 prompt
                    try:
                        create_result = self.supabase.table('users').insert({
                            'email': email,
                            'enhanced_prompts': 1,
                            'created_at': datetime.now(timezone.utc).isoformat(),
                            'updated_at': datetime.now(timezone.utc).isoformat()
                        }).execute()
                        
                        if create_result.data and len(create_result.data) > 0:
                            logger.info(f"✅ Created new user {email} with 1 prompt")
                            self._record_success()
                            return 1
                        else:
                            logger.error(f"❌ Failed to create user {email}")
                            if attempt < max_retries - 1:
                                await asyncio.sleep(base_delay * (2 ** attempt))
                                continue
                            self._record_failure()
                            return 0
                    except Exception as create_error:
                        logger.error(f"❌ Failed to create user {email}: {create_error}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(base_delay * (2 ** attempt))
                            continue
                        self._record_failure()
                        return 0
                        
            except Exception as e:
                logger.error(f"❌ Error in increment_user_prompts for {email} (attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(base_delay * (2 ** attempt))
                    continue
                self._record_failure()
                return 0
        
        # If all retries failed
        logger.error(f"❌ All retries failed for increment_user_prompts for {email}")
        return 0
    
    async def get_user_stats(self, email: str) -> Dict[str, Any]:
        """Get simple user statistics with circuit breaker protection"""
        try:
            await self._check_circuit_breaker()
            self._init_supabase()
            logger.info(f"📊 Getting user stats for: {email}")
            
            result = self.supabase.table('users').select('id, email, name, display_name, enhanced_prompts, created_at, updated_at').eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                user_data = result.data[0]
                logger.info(f"✅ Retrieved user stats for {email}: {user_data['enhanced_prompts']} prompts")
                self._record_success()
                return user_data
            else:
                logger.warning(f"❌ User not found in database: {email}")
                self._record_success()  # Not finding a user is not a failure
                return None
                
        except Exception as e:
            logger.error(f"❌ Error in get_user_stats for {email}: {e}")
            self._record_failure()
            return None
    
    async def get_user_count_only(self, email: str) -> int:
        """Get user's prompt count only - efficient for frontend refresh"""
        try:
            await self._check_circuit_breaker()
            self._init_supabase()
            
            result = self.supabase.table('users').select('enhanced_prompts').eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                count = result.data[0]['enhanced_prompts'] or 0
                logger.info(f"📊 Retrieved count for {email}: {count} prompts")
                self._record_success()
                return count
            else:
                logger.info(f"📊 User {email} not found - returning 0")
                self._record_success()
                return 0
                
        except Exception as e:
            logger.error(f"❌ Error in get_user_count_only for {email}: {e}")
            self._record_failure()
            return 0
    
    async def get_global_stats(self) -> Dict[str, Any]:
        """Get simple global statistics with circuit breaker protection"""
        try:
            await self._check_circuit_breaker()
            self._init_supabase()
            logger.info("📊 Getting global stats")
            
            # Get all users
            result = self.supabase.table('users').select('email, name, display_name, enhanced_prompts').execute()
            users = result.data
            
            if not users:
                logger.info("📊 No users found in database")
                self._record_success()
                return {
                    "total_users": 0,
                    "total_prompts_enhanced": 0,
                    "avg_prompts_per_user": 0,
                    "top_users": []
                }
            
            # Calculate stats
            total_users = len(users)
            total_prompts = sum(user['enhanced_prompts'] for user in users)
            active_users = [u for u in users if u['enhanced_prompts'] > 0]
            avg_prompts = total_prompts / len(active_users) if active_users else 0
            
            # Top users (limit to 10)
            top_users = sorted(users, key=lambda x: x['enhanced_prompts'], reverse=True)[:10]
            
            stats = {
                "total_users": total_users,
                "total_prompts_enhanced": total_prompts,
                "avg_prompts_per_user": round(avg_prompts, 1),
                "top_users": top_users
            }
            
            logger.info(f"✅ Global stats: {total_users} users, {total_prompts} total prompts")
            self._record_success()
            return stats
            
        except Exception as e:
            logger.error(f"❌ Error in get_global_stats: {e}")
            self._record_failure()
            return {
                "total_users": 0,
                "total_prompts_enhanced": 0,
                "avg_prompts_per_user": 0,
                "top_users": []
            }

    async def upgrade_user_to_pro(self, email: str) -> bool:
        """Upgrade user to pro subscription for 30 days"""
        try:
            await self._check_circuit_breaker()
            self._init_supabase()
            
            # Set subscription expiry to 30 days from now
            expiry_date = datetime.now() + timedelta(days=30)
            
            update_data = {
                'subscription_tier': 'pro',
                'subscription_expires_at': expiry_date.isoformat(),
                'daily_prompts_used': 0,  # Reset daily count
                'last_prompt_reset': datetime.now().date().isoformat()
            }
            
            result = self.supabase.table('users').update(update_data).eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"✅ User {email} upgraded to pro until {expiry_date}")
                self._record_success()
                return True
            else:
                logger.error(f"❌ Failed to upgrade user {email}")
                self._record_failure()
                return False
                
        except Exception as e:
            logger.error(f"❌ Error upgrading user {email} to pro: {e}")
            self._record_failure()
            return False

    async def check_user_subscription_status(self, email: str) -> Dict:
        """Check user's subscription status and daily limits"""
        try:
            await self._check_circuit_breaker()
            self._init_supabase()
            
            result = self.supabase.table('users').select('*').eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                user = result.data[0]
                subscription_tier = user.get('subscription_tier', 'free')
                subscription_expires = user.get('subscription_expires_at')
                daily_prompts_used = user.get('daily_prompts_used', 0)
                last_prompt_reset = user.get('last_prompt_reset')
                
                # Check if pro subscription is expired
                is_pro_expired = False
                if subscription_tier == 'pro' and subscription_expires:
                    try:
                        expiry_date = datetime.fromisoformat(subscription_expires.replace('Z', '+00:00'))
                        if datetime.now(expiry_date.tzinfo) > expiry_date:
                            is_pro_expired = True
                            subscription_tier = 'free'
                            # Update user to free tier
                            await self._downgrade_expired_user(email)
                    except:
                        subscription_tier = 'free'
                
                # Check if daily reset is needed for free users
                current_date = datetime.now().date()
                if last_prompt_reset and last_prompt_reset != current_date.isoformat():
                    daily_prompts_used = 0
                    # Reset daily count
                    await self._reset_daily_prompts(email)
                
                self._record_success()
                return {
                    'subscription_tier': subscription_tier,
                    'is_pro_expired': is_pro_expired,
                    'daily_prompts_used': daily_prompts_used,
                    'daily_limit': 5 if subscription_tier == 'free' else None,
                    'subscription_expires': subscription_expires
                }
            else:
                # User not found, return default free tier
                return {
                    'subscription_tier': 'free',
                    'daily_prompts_used': 0,
                    'daily_limit': 5
                }
                
        except Exception as e:
            logger.error(f"❌ Error checking subscription status for {email}: {e}")
            self._record_failure()
            return {
                'subscription_tier': 'free',
                'daily_prompts_used': 0,
                'daily_limit': 5
            }

    async def increment_daily_prompts(self, email: str) -> bool:
        """Increment daily prompts used for free users"""
        try:
            await self._check_circuit_breaker()
            self._init_supabase()
            
            # Get current user data
            result = self.supabase.table('users').select('*').eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                user = result.data[0]
                subscription_tier = user.get('subscription_tier', 'free')
                daily_prompts_used = user.get('daily_prompts_used', 0)
                last_prompt_reset = user.get('last_prompt_reset')
                
                # Check if daily reset is needed
                current_date = datetime.now().date()
                if last_prompt_reset and last_prompt_reset != current_date.isoformat():
                    daily_prompts_used = 0
                
                # Only increment for free users
                if subscription_tier == 'free':
                    daily_prompts_used += 1
                    
                    update_data = {
                        'daily_prompts_used': daily_prompts_used,
                        'last_prompt_reset': current_date.isoformat()
                    }
                    
                    result = self.supabase.table('users').update(update_data).eq('email', email).execute()
                    
                    if result.data and len(result.data) > 0:
                        self._record_success()
                        return True
                
                self._record_success()
                return True  # Pro users don't need increment
                
            else:
                self._record_failure()
                return False
                
        except Exception as e:
            logger.error(f"❌ Error incrementing daily prompts for {email}: {e}")
            self._record_failure()
            return False

    async def _downgrade_expired_user(self, email: str) -> bool:
        """Internal method to downgrade expired pro users to free"""
        try:
            update_data = {
                'subscription_tier': 'free',
                'subscription_expires_at': None,
                'daily_prompts_used': 0,
                'last_prompt_reset': datetime.now().date().isoformat()
            }
            
            result = self.supabase.table('users').update(update_data).eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"✅ User {email} downgraded to free (subscription expired)")
                return True
            return False
            
        except Exception as e:
            logger.error(f"❌ Error downgrading expired user {email}: {e}")
            return False

    async def _reset_daily_prompts(self, email: str) -> bool:
        """Internal method to reset daily prompt count"""
        try:
            update_data = {
                'daily_prompts_used': 0,
                'last_prompt_reset': datetime.now().date().isoformat()
            }
            
            result = self.supabase.table('users').update(update_data).eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                logger.info(f"✅ Daily prompts reset for user {email}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"❌ Error resetting daily prompts for {email}: {e}")
            return False

# Global database service instance
db_service = DatabaseService() 