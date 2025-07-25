"""
Monitoring Middleware for FastAPI
Tracks requests, response times, and errors
"""

import time
import logging
from fastapi import Request, Response
from app.monitoring.health_monitor import health_monitor

logger = logging.getLogger(__name__)

async def monitoring_middleware(request: Request, call_next):
    """Middleware to monitor requests and performance"""
    start_time = time.time()
    
    try:
        # Process the request
        response = await call_next(request)
        
        # Calculate response time
        response_time = time.time() - start_time
        
        # Record the request
        health_monitor.record_request(
            path=str(request.url.path),
            method=request.method,
            response_time=response_time,
            status_code=response.status_code
        )
        
        # Add monitoring headers
        response.headers["X-Response-Time"] = f"{response_time:.4f}s"
        response.headers["X-Request-ID"] = str(int(start_time * 1000))
        
        return response
        
    except Exception as e:
        # Calculate response time for errors
        response_time = time.time() - start_time
        
        # Record the error
        health_monitor.record_request(
            path=str(request.url.path),
            method=request.method,
            response_time=response_time,
            status_code=500
        )
        
        logger.error(f"Request failed: {request.method} {request.url.path} - {str(e)}")
        raise 