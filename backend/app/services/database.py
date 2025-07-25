import os
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone
import asyncpg
from supabase import create_client, Client
from config import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    """Database service for user tracking and analytics"""
    
    def __init__(self):
        self.connection_pool = None
        self.supabase_url = settings.supabase_url
        self.supabase_key = settings.supabase_service_key
        self.supabase: Optional[Client] = None
        
    def _init_supabase(self):
        """Initialize Supabase client lazily"""
        if self.supabase is None:
            if not self.supabase_url or not self.supabase_key:
                raise ValueError("Supabase URL and key are required")
            self.supabase = create_client(self.supabase_url, self.supabase_key)
        
    async def get_connection(self):
        """Get database connection"""
        if not self.connection_pool:
            # Use Supabase connection string - fixed format
            # Extract project ref from URL
            project_ref = self.supabase_url.split('//')[1].split('.')[0]
            database_url = f"postgresql://postgres:{self.supabase_key}@db.{project_ref}.supabase.co:5432/postgres"
            self.connection_pool = await asyncpg.create_pool(database_url)
        
        return await self.connection_pool.acquire()
    
    async def close(self):
        """Close database connections"""
        if self.connection_pool:
            await self.connection_pool.close()
    
    async def get_or_create_user(self, email: str, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Get existing user or create new one"""
        try:
            self._init_supabase()
            # Check if user exists
            result = self.supabase.table('users').select('*').eq('email', email).execute()
            
            if result.data:
                user = result.data[0]
                # Update name if provided and different (only if name column exists)
                if user_info.get('name') and user.get('name') != user_info.get('name'):
                    try:
                        self.supabase.table('users').update({
                            'name': user_info.get('name')
                        }).eq('email', email).execute()
                        user['name'] = user_info.get('name')
                    except Exception:
                        # Name column doesn't exist, skip update
                        pass
                return user
            else:
                # Create new user with name (handle case where name column might not exist)
                insert_data = {
                    'email': email,
                    'enhanced_prompts': 0
                }
                
                # Only add name if it's provided
                if user_info.get('name'):
                    insert_data['name'] = user_info.get('name')
                
                result = self.supabase.table('users').insert(insert_data).execute()
                
                logger.info(f"Created new user: {email} with name: {user_info.get('name')}")
                return result.data[0]
                
        except Exception as e:
            logger.error(f"Error in get_or_create_user: {e}")
            raise
    
    async def increment_user_prompts(self, email: str) -> int:
        """Increment user's enhanced_prompts count and return new total"""
        try:
            self._init_supabase()
            
            # Get current count
            get_result = self.supabase.table('users').select('enhanced_prompts').eq('email', email).execute()
            
            if get_result.data and len(get_result.data) > 0:
                current_count = get_result.data[0]['enhanced_prompts'] or 0
                new_count = current_count + 1
                
                # Update count
                update_result = self.supabase.table('users').update({
                    'enhanced_prompts': new_count
                }).eq('email', email).execute()
                
                if update_result.data:
                    logger.info(f"✅ Incremented prompts for {email}: {new_count}")
                    return new_count
                else:
                    logger.error(f"❌ Failed to update count for {email}")
                    return current_count
            else:
                logger.warning(f"❌ User not found for prompt increment: {email}")
                return 0
                
        except Exception as e:
            logger.error(f"❌ Error in increment_user_prompts for {email}: {e}")
            return 0
    
    async def get_user_stats(self, email: str) -> Dict[str, Any]:
        """Get simple user statistics"""
        try:
            self._init_supabase()
            
# Simple query without name column first
            result = self.supabase.table('users').select('id, email, enhanced_prompts, created_at').eq('email', email).execute()
            
            if result.data and len(result.data) > 0:
                user_data = result.data[0]
                # Add name field if it doesn't exist
                if 'name' not in user_data:
                    user_data['name'] = None
                logger.info(f"✅ Retrieved user stats for {email}: {user_data['enhanced_prompts']} prompts")
                return user_data
            else:
                logger.warning(f"❌ User not found in database: {email}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error in get_user_stats for {email}: {e}")
            return None
    
    # Removed detailed logging - keeping it simple
    
    async def get_global_stats(self) -> Dict[str, Any]:
        """Get simple global statistics"""
        try:
            self._init_supabase()
            # Get all users
            result = self.supabase.table('users').select('email, enhanced_prompts').execute()
            users = result.data
            
            if not users:
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
            
            # Top users
            top_users = sorted(users, key=lambda x: x['enhanced_prompts'], reverse=True)[:10]
            
            return {
                "total_users": total_users,
                "total_prompts_enhanced": total_prompts,
                "avg_prompts_per_user": round(avg_prompts, 1),
                "top_users": top_users
            }
            
        except Exception as e:
            logger.error(f"Error in get_global_stats: {e}")
            return {
                "total_users": 0,
                "total_prompts_enhanced": 0,
                "avg_prompts_per_user": 0,
                "top_users": []
            }

# Global database service instance
db_service = DatabaseService() 