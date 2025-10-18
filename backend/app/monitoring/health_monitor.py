"""
Health Monitoring System for the Backend
Tracks system health, performance, and errors
"""

import time
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict, deque
import psutil
import os

logger = logging.getLogger(__name__)

class HealthMonitor:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.response_times = deque(maxlen=1000)
        self.error_log = deque(maxlen=100)
        self.performance_metrics = defaultdict(int)
        
        # System metrics
        self.cpu_usage = 0
        self.memory_usage = 0
        self.disk_usage = 0
        
        # Health status
        self.is_healthy = True
        self.last_check = time.time()
        
        # Database health tracking
        self.db_health_status = None
        self.last_db_check = 0
        
    def record_request(self, path: str, method: str, response_time: float, status_code: int):
        """Record a request for monitoring"""
        self.request_count += 1
        self.response_times.append(response_time)
        
        # Record performance metrics
        self.performance_metrics[f"{method}_{path}"] += 1
        
        # Record errors
        if status_code >= 400:
            self.error_count += 1
            self.error_log.append({
                'timestamp': datetime.now().isoformat(),
                'path': path,
                'method': method,
                'status_code': status_code,
                'response_time': response_time
            })
            
            # Mark as unhealthy if too many errors
            if self.error_count > 50:
                self.is_healthy = False
                logger.error(f"System marked as unhealthy due to {self.error_count} errors")
    
    async def check_database_health(self):
        """Check database health status"""
        try:
            from app.utils.database import db_service
            self.db_health_status = await db_service.health_check()
            self.last_db_check = time.time()
            logger.info("Database health check completed")
        except Exception as e:
            logger.error(f"Failed to check database health: {e}")
            self.db_health_status = {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def update_system_metrics(self):
        """Update system resource usage"""
        try:
            self.cpu_usage = psutil.cpu_percent(interval=1)
            self.memory_usage = psutil.virtual_memory().percent
            self.disk_usage = psutil.disk_usage('/').percent
            
            # Check for resource issues
            if self.cpu_usage > 90 or self.memory_usage > 90 or self.disk_usage > 90:
                self.is_healthy = False
                logger.warning(f"System resources critical: CPU={self.cpu_usage}%, Memory={self.memory_usage}%, Disk={self.disk_usage}%")
            else:
                self.is_healthy = True
                
        except Exception as e:
            logger.error(f"Failed to update system metrics: {e}")
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get comprehensive health status including database health"""
        self.update_system_metrics()
        
        # Check database health if not checked recently
        if time.time() - self.last_db_check > 60:  # Check every minute
            await self.check_database_health()
        
        # Calculate response time statistics
        avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
        max_response_time = max(self.response_times) if self.response_times else 0
        min_response_time = min(self.response_times) if self.response_times else 0
        
        # Calculate error rate
        error_rate = (self.error_count / self.request_count * 100) if self.request_count > 0 else 0
        
        # Uptime
        uptime = time.time() - self.start_time
        
        # Overall health depends on system and database health
        overall_healthy = self.is_healthy and (
            self.db_health_status is None or 
            self.db_health_status.get("status") == "healthy"
        )
        
        return {
            "status": "healthy" if overall_healthy else "unhealthy",
            "uptime_seconds": int(uptime),
            "uptime_formatted": str(timedelta(seconds=int(uptime))),
            "request_count": self.request_count,
            "error_count": self.error_count,
            "error_rate_percent": round(error_rate, 2),
            "response_times": {
                "average_ms": round(avg_response_time * 1000, 2),
                "max_ms": round(max_response_time * 1000, 2),
                "min_ms": round(min_response_time * 1000, 2)
            },
            "system_metrics": {
                "cpu_usage_percent": round(self.cpu_usage, 2),
                "memory_usage_percent": round(self.memory_usage, 2),
                "disk_usage_percent": round(self.disk_usage, 2)
            },
            "database_health": self.db_health_status,
            "recent_errors": list(self.error_log)[-10:],  # Last 10 errors
            "top_endpoints": dict(sorted(
                self.performance_metrics.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10])  # Top 10 endpoints
        }
    
    async def get_simple_health(self) -> Dict[str, Any]:
        """Get simple health check for load balancers"""
        # Check database health if not checked recently
        if time.time() - self.last_db_check > 60:
            await self.check_database_health()
        
        db_healthy = (
            self.db_health_status is None or 
            self.db_health_status.get("status") == "healthy"
        )
        
        overall_healthy = self.is_healthy and db_healthy
        
        return {
            "status": "healthy" if overall_healthy else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": int(time.time() - self.start_time),
            "database_healthy": db_healthy
        }
    
    def reset_metrics(self):
        """Reset monitoring metrics (useful for testing)"""
        self.request_count = 0
        self.error_count = 0
        self.response_times.clear()
        self.error_log.clear()
        self.performance_metrics.clear()
        self.is_healthy = True
        self.db_health_status = None
        self.last_db_check = 0
        logger.info("Health monitoring metrics reset")

# Global health monitor instance
health_monitor = HealthMonitor()

def get_health_monitor():
    """Get health monitor instance"""
    return health_monitor 