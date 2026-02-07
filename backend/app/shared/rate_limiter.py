"""
Lightweight, high-performance in-memory rate limiter.
"""
import time
from collections import defaultdict, deque
from fastapi import Request
from fastapi.responses import JSONResponse

class SimpleRateLimiter:
    """
    Token-bucket style rate limiter.
    Limit: 100 requests per hour per user/IP.
    """
    def __init__(self):
        # Requests storage: key -> deque of timestamps
        self.requests = defaultdict(lambda: deque(maxlen=100))
        self.limit = 100
        self.window = 3600  # 1 hour in seconds
        
        # Whitelisted paths (Auth, Health)
        self.whitelist = {
            "/api/v1/auth", "/api/v1/signin", "/api/v1/login",
            "/api/v1/users", "/health", "/api/v1/health"
        }

    async def __call__(self, request: Request, call_next):
        # 1. Check Whitelist
        path = request.url.path
        if any(path.startswith(w) for w in self.whitelist):
            return await call_next(request)

        # 2. Identify Client (User ID > IP)
        client_id = self._get_client_id(request)
        
        # 3. Check Limit
        if not self._allow_request(client_id):
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded", "retry_after": 60}
            )

        return await call_next(request)

    def _get_client_id(self, request: Request) -> str:
        """Get best available identifier."""
        # Try Authorization header first
        auth = request.headers.get("Authorization")
        if auth and "Bearer" in auth:
            # Simple hash of token to identify user without full decoding overhead
            return f"token:{hash(auth)}"
            
        # Fallback to IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return f"ip:{forwarded.split(',')[0]}"
        return f"ip:{request.client.host}"

    def _allow_request(self, client_id: str) -> bool:
        """Check if request is allowed."""
        now = time.time()
        history = self.requests[client_id]
        
        # Clean old requests
        while history and history[0] < now - self.window:
            history.popleft()
            
        if len(history) >= self.limit:
            return False
            
        history.append(now)
        return True

# Global instance
rate_limiter = SimpleRateLimiter()
