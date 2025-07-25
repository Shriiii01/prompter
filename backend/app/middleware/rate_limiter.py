"""
Rate Limiting Middleware for FastAPI
Prevents abuse and protects against DDoS attacks
"""

import time
import asyncio
from collections import defaultdict, deque
from typing import Dict, Deque, Optional
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self):
        # Store rate limit data: {ip: deque(timestamps)}
        self.rate_limit_data: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=100))
        
        # Rate limit settings
        self.requests_per_minute = 60  # 60 requests per minute per IP
        self.requests_per_hour = 1000  # 1000 requests per hour per IP
        self.burst_limit = 10  # 10 requests per 10 seconds
        
        # Cleanup interval (clean old data every 5 minutes)
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # 5 minutes
        
    def _cleanup_old_data(self):
        """Remove old rate limit data to prevent memory leaks"""
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            cutoff_time = current_time - 3600  # 1 hour ago
            
            for ip in list(self.rate_limit_data.keys()):
                # Remove old timestamps
                self.rate_limit_data[ip] = deque(
                    [ts for ts in self.rate_limit_data[ip] if ts > cutoff_time],
                    maxlen=100
                )
                
                # Remove empty entries
                if not self.rate_limit_data[ip]:
                    del self.rate_limit_data[ip]
            
            self.last_cleanup = current_time
            logger.info(f"Rate limiter cleanup completed. Active IPs: {len(self.rate_limit_data)}")
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address from request"""
        # Check for forwarded headers (for proxy/load balancer setups)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return request.client.host if request.client else "unknown"
    
    def _check_rate_limit(self, ip: str) -> bool:
        """Check if IP is within rate limits"""
        current_time = time.time()
        
        # Get timestamps for this IP
        timestamps = self.rate_limit_data[ip]
        timestamps.append(current_time)
        
        # Check minute limit (last 60 seconds)
        minute_ago = current_time - 60
        recent_requests = sum(1 for ts in timestamps if ts > minute_ago)
        
        if recent_requests > self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for IP {ip}: {recent_requests} requests in last minute")
            return False
        
        # Check hour limit (last 3600 seconds)
        hour_ago = current_time - 3600
        hourly_requests = sum(1 for ts in timestamps if ts > hour_ago)
        
        if hourly_requests > self.requests_per_hour:
            logger.warning(f"Hourly rate limit exceeded for IP {ip}: {hourly_requests} requests in last hour")
            return False
        
        # Check burst limit (last 10 seconds)
        ten_seconds_ago = current_time - 10
        burst_requests = sum(1 for ts in timestamps if ts > ten_seconds_ago)
        
        if burst_requests > self.burst_limit:
            logger.warning(f"Burst rate limit exceeded for IP {ip}: {burst_requests} requests in last 10 seconds")
            return False
        
        return True
    
    async def __call__(self, request: Request, call_next):
        """Rate limiting middleware"""
        try:
            # Cleanup old data periodically
            self._cleanup_old_data()
            
            # Get client IP
            client_ip = self._get_client_ip(request)
            
            # Skip rate limiting for health checks
            if request.url.path == "/api/v1/health":
                return await call_next(request)
            
            # Check rate limit
            if not self._check_rate_limit(client_ip):
                logger.warning(f"Rate limit exceeded for IP: {client_ip}, Path: {request.url.path}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Rate limit exceeded",
                        "message": "Too many requests. Please try again later.",
                        "retry_after": 60
                    }
                )
            
            # Continue with request
            response = await call_next(request)
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(max(0, self.requests_per_minute - len(self.rate_limit_data[client_ip])))
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Continue with request if rate limiter fails
            return await call_next(request)

# Global rate limiter instance
rate_limiter = RateLimiter()

def get_rate_limiter():
    """Get rate limiter instance"""
    return rate_limiter 