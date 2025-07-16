import json
import redis.asyncio as redis
from typing import Optional, Any
from config import settings

class CacheService:
    """Redis caching service"""
    
    def __init__(self):
        self.redis = None
        self._connected = False
    
    async def _ensure_connected(self):
        """Ensure Redis connection is established"""
        if not self._connected:
            try:
                self.redis = await redis.from_url(settings.redis_url)
                self._connected = True
            except Exception:
                # If Redis is not available, caching will be disabled
                self._connected = False
    
    async def get(self, key: str) -> Optional[dict]:
        """Get cached value"""
        await self._ensure_connected()
        if not self._connected:
            return None
            
        try:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        except Exception:
            pass
        return None
    
    async def set(self, key: str, value: dict, ttl: int = 3600) -> None:
        """Set cached value with TTL"""
        await self._ensure_connected()
        if not self._connected:
            return
            
        try:
            await self.redis.setex(key, ttl, json.dumps(value, default=str))
        except Exception:
            pass