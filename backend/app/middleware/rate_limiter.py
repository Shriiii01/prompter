"""
Rate Limiting Middleware for FastAPI
Prevents abuse and protects against DDoS attacks
"""

import time
import hashlib
import json
import logging
from typing import Dict, Optional, Tuple
from collections import defaultdict, deque
from fastapi import Request, HTTPException, Response
from fastapi.responses import JSONResponse
import redis.asyncio as redis
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AdvancedRateLimiter:
    def __init__(self):
        # Rate limits - 1000 requests per month per user (much more reasonable)
        self.user_monthly_limit = 1000
        self.user_hourly_limit = 100  # Hourly limit for burst protection (10x increase)
        self.user_minute_limit = 30   # Minute limit for burst protection (10x increase)
        self.ip_hourly_limit = 100
        self.ip_minute_limit = 20
        
        # Cooldown periods (in seconds)
        self.cooldown_periods = {
            'first_violation': 60,    # 1 minute
            'second_violation': 300,  # 5 minutes
            'third_violation': 1800,  # 30 minutes
            'max_violation': 3600     # 1 hour
        }
        
        # In-memory storage (fallback if Redis unavailable)
        self.user_requests = defaultdict(lambda: deque(maxlen=1000))
        self.ip_requests = defaultdict(lambda: deque(maxlen=1000))
        self.user_violations = defaultdict(int)
        self.ip_violations = defaultdict(int)
        self.cooldowns = {}
        
        # Redis connection (optional)
        self.redis_client = None
        self.redis_available = False
        
        # Initialize Redis (will be called asynchronously when needed)
        # self._init_redis()  # Commented out to avoid async warning
    
    async def _init_redis(self):
        """Initialize Redis connection for distributed rate limiting"""
        try:
            self.redis_client = redis.Redis(
                host='localhost',
                port=6379,
                db=0,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1
            )
            await self.redis_client.ping()
            self.redis_available = True
            logger.info("✅ Redis connected for distributed rate limiting")
        except Exception as e:
            logger.warning(f"⚠️ Redis unavailable, using in-memory rate limiting: {e}")
            self.redis_available = False
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP with proxy support"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _get_user_identifier(self, request: Request) -> Optional[str]:
        """Get user identifier from token or email"""
        try:
            # Try to get from Authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                # Decode JWT to get user email
                import jwt
                payload = jwt.decode(token, options={"verify_signature": False})
                return payload.get("email")
            
            # Try to get from query params (for unauthenticated endpoints)
            email = request.query_params.get("email")
            if email:
                return email
                
            return None
        except Exception as e:
            logger.warning(f"Could not extract user identifier: {e}")
            return None
    
    def _generate_request_fingerprint(self, request: Request) -> str:
        """Generate unique fingerprint for request"""
        fingerprint_data = {
            'ip': self._get_client_ip(request),
            'user_agent': request.headers.get("User-Agent", ""),
            'path': str(request.url.path),
            'method': request.method
        }
        return hashlib.sha256(json.dumps(fingerprint_data, sort_keys=True).encode()).hexdigest()
    
    async def _check_redis_rate_limit(self, key: str, limit: int, window: int) -> Tuple[bool, int, int]:
        """Check rate limit using Redis"""
        try:
            current_time = int(time.time())
            window_start = current_time - window
            
            # Use Redis sorted set for sliding window
            await self.redis_client.zremrangebyscore(key, 0, window_start)
            current_count = await self.redis_client.zcard(key)
            
            if current_count >= limit:
                return False, current_count, limit
            
            # Add current request
            await self.redis_client.zadd(key, {str(current_time): current_time})
            await self.redis_client.expire(key, window)
            
            return True, current_count + 1, limit
            
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            return True, 0, limit  # Allow request if Redis fails
    
    def _check_memory_rate_limit(self, requests_deque: deque, limit: int, window: int) -> Tuple[bool, int, int]:
        """Check rate limit using in-memory storage"""
        current_time = time.time()
        window_start = current_time - window
        
        # Remove old requests outside the window
        while requests_deque and requests_deque[0] < window_start:
            requests_deque.popleft()
        
        current_count = len(requests_deque)
        
        if current_count >= limit:
            return False, current_count, limit
        
        # Add current request
        requests_deque.append(current_time)
        return True, current_count + 1, limit
    
    async def _check_rate_limit(self, identifier: str, limit: int, window: int, redis_key: str = None) -> Tuple[bool, int, int]:
        """Check rate limit with Redis fallback"""
        if self.redis_available and redis_key:
            return await self._check_redis_rate_limit(redis_key, limit, window)
        else:
            # Use in-memory storage
            requests_deque = self.user_requests[identifier] if "user:" in identifier else self.ip_requests[identifier]
            return self._check_memory_rate_limit(requests_deque, limit, window)
    
    def _is_in_cooldown(self, identifier: str) -> bool:
        """Check if identifier is in cooldown period"""
        if identifier in self.cooldowns:
            cooldown_until = self.cooldowns[identifier]
            if time.time() < cooldown_until:
                return True
            else:
                del self.cooldowns[identifier]
        return False
    
    def _add_cooldown(self, identifier: str, violation_count: int):
        """Add cooldown period based on violation count"""
        if violation_count <= 1:
            cooldown_seconds = self.cooldown_periods['first_violation']
        elif violation_count == 2:
            cooldown_seconds = self.cooldown_periods['second_violation']
        elif violation_count == 3:
            cooldown_seconds = self.cooldown_periods['third_violation']
        else:
            cooldown_seconds = self.cooldown_periods['max_violation']
        
        cooldown_until = time.time() + cooldown_seconds
        self.cooldowns[identifier] = cooldown_until
        
        logger.warning(f"Rate limit violation for {identifier}: {violation_count} violations, cooldown for {cooldown_seconds}s")
    
    async def __call__(self, request: Request, call_next):
        """Main rate limiting middleware"""
        start_time = time.time()
        
        # Skip rate limiting for authentication, sign-in, and user endpoints
        auth_endpoints = [
            "/api/v1/auth",
            "/api/v1/signin", 
            "/api/v1/sign-in",
            "/api/v1/login",
            "/api/v1/oauth",
            "/api/v1/google",
            "/api/v1/users",  # ADD THIS - NO RATE LIMITING FOR USER ENDPOINTS!
            "/api/v1/user/stats",
            "/api/v1/user/count",
            "/health",
            "/api/v1/health"
        ]
        
        # Check if this is an authentication endpoint
        for auth_endpoint in auth_endpoints:
            if request.url.path.startswith(auth_endpoint):
                logger.info(f"🔓 Skipping rate limiting for auth endpoint: {request.url.path}")
                response = await call_next(request)
                return response
        
        # Get identifiers
        client_ip = self._get_client_ip(request)
        user_id = self._get_user_identifier(request)
        request_fingerprint = self._generate_request_fingerprint(request)
        
        # Check cooldowns first
        if user_id and self._is_in_cooldown(f"user:{user_id}"):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": "You are temporarily blocked due to rate limit violations",
                    "retry_after": int(self.cooldowns[f"user:{user_id}"] - time.time())
                }
            )
        
        if self._is_in_cooldown(f"ip:{client_ip}"):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": "Your IP is temporarily blocked due to rate limit violations",
                    "retry_after": int(self.cooldowns[f"ip:{client_ip}"] - time.time())
                }
            )
        
        # Check rate limits
        rate_limit_checks = []
        
        # User-based limits (if authenticated)
        if user_id:
            user_monthly_allowed, user_monthly_count, user_monthly_limit = await self._check_rate_limit(
                f"user:{user_id}", self.user_monthly_limit, 2592000, f"rate_limit:user_monthly:{user_id}"  # 30 days in seconds
            )
            user_hourly_allowed, user_hourly_count, user_hourly_limit = await self._check_rate_limit(
                f"user:{user_id}", self.user_hourly_limit, 3600, f"rate_limit:user_hourly:{user_id}"
            )
            user_minute_allowed, user_minute_count, user_minute_limit = await self._check_rate_limit(
                f"user:{user_id}", self.user_minute_limit, 60, f"rate_limit:user_minute:{user_id}"
            )
            rate_limit_checks.extend([
                ("user_monthly", user_monthly_allowed, user_monthly_count, user_monthly_limit),
                ("user_hourly", user_hourly_allowed, user_hourly_count, user_hourly_limit),
                ("user_minute", user_minute_allowed, user_minute_count, user_minute_limit)
            ])
        
        # IP-based limits (always check)
        ip_hourly_allowed, ip_hourly_count, ip_hourly_limit = await self._check_rate_limit(
            f"ip:{client_ip}", self.ip_hourly_limit, 3600, f"rate_limit:ip_hourly:{client_ip}"
        )
        ip_minute_allowed, ip_minute_count, ip_minute_limit = await self._check_rate_limit(
            f"ip:{client_ip}", self.ip_minute_limit, 60, f"rate_limit:ip_minute:{client_ip}"
        )
        rate_limit_checks.extend([
            ("ip_hourly", ip_hourly_allowed, ip_hourly_count, ip_hourly_limit),
            ("ip_minute", ip_minute_allowed, ip_minute_count, ip_minute_limit)
        ])
        
        # Check if any limits exceeded
        for limit_type, allowed, count, limit in rate_limit_checks:
            if not allowed:
                # Increment violation count
                if "user:" in limit_type:
                    self.user_violations[user_id] += 1
                    violation_count = self.user_violations[user_id]
                    self._add_cooldown(f"user:{user_id}", violation_count)
                else:
                    self.ip_violations[client_ip] += 1
                    violation_count = self.ip_violations[client_ip]
                    self._add_cooldown(f"ip:{client_ip}", violation_count)
                
                # Log violation
                logger.warning(f"Rate limit exceeded: {limit_type} for {user_id or client_ip} - {count}/{limit}")
                
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Limit: {limit} per {limit_type.split('_')[1]}",
                        "current_count": count,
                        "limit": limit,
                        "limit_type": limit_type,
                        "retry_after": 60
                    }
                )
        
        # All checks passed, proceed with request
        response = await call_next(request)
        
        # Add rate limit headers
        if user_id:
            response.headers["X-RateLimit-User-Monthly"] = f"{user_monthly_count}/{user_monthly_limit}"
            response.headers["X-RateLimit-User-Hourly"] = f"{user_hourly_count}/{user_hourly_limit}"
            response.headers["X-RateLimit-User-Minute"] = f"{user_minute_count}/{user_minute_limit}"
        
        response.headers["X-RateLimit-IP-Hourly"] = f"{ip_hourly_count}/{ip_hourly_limit}"
        response.headers["X-RateLimit-IP-Minute"] = f"{ip_minute_count}/{ip_minute_limit}"
        response.headers["X-RateLimit-Reset"] = str(int(time.time() + 3600))  # Next hour
        
        # Log successful request
        request_time = time.time() - start_time
        logger.info(f"Rate limit check passed: {request.method} {request.url.path} - {request_time:.3f}s")
        
        return response

# Create rate limiter instance
rate_limiter = AdvancedRateLimiter() 