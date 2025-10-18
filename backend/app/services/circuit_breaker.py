import time
import logging
from enum import Enum
from typing import Dict, Any

logger = logging.getLogger(__name__)

class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    """
    Circuit breaker implementation for managing provider failures
    """
    
    def __init__(self, failure_threshold: int = 5, timeout_duration: int = 60, success_threshold: int = 3):
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.last_success_time = None
        self.failure_threshold = failure_threshold
        self.timeout_duration = timeout_duration
        self.success_threshold = success_threshold
    
    def is_closed(self) -> bool:
        """Check if circuit breaker is closed"""
        if self.state == CircuitState.CLOSED:
            return True
        elif self.state == CircuitState.OPEN:
            # Check if timeout has passed
            if self.last_failure_time:
                if time.time() - self.last_failure_time > self.timeout_duration:
                    self.state = CircuitState.HALF_OPEN
                    logger.info("🔄 Circuit breaker transitioning to half-open")
                    return True
            return False
        elif self.state == CircuitState.HALF_OPEN:
            return True
        
        return False
    
    def record_success(self):
        """Record a successful request"""
        self.success_count += 1
        self.last_success_time = time.time()
        
        # Close circuit if enough successes
        if self.state == CircuitState.HALF_OPEN and self.success_count >= self.success_threshold:
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            logger.info(" Circuit breaker closed")
    
    def record_failure(self):
        """Record a failed request"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        # Open circuit if too many failures
        if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(" Circuit breaker opened")
        elif self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            logger.warning(" Circuit breaker reopened")
    
    def get_state(self) -> Dict[str, Any]:
        """Get current circuit breaker state"""
        return {
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'last_failure_time': self.last_failure_time,
            'last_success_time': self.last_success_time
        }

class CircuitBreakerManager:
    """
    Manages circuit breakers for multiple providers
    """
    
    def __init__(self, providers: list):
        self.circuit_breakers = {}
        self._initialize_circuit_breakers(providers)
    
    def _initialize_circuit_breakers(self, providers: list):
        """Initialize circuit breakers for each provider"""
        for provider in providers:
            self.circuit_breakers[provider] = CircuitBreaker()
    
    def is_circuit_closed(self, provider: str) -> bool:
        """Check if circuit breaker is closed for a provider"""
        if provider not in self.circuit_breakers:
            return False
        return self.circuit_breakers[provider].is_closed()
    
    def record_success(self, provider: str):
        """Record successful request for a provider"""
        if provider in self.circuit_breakers:
            self.circuit_breakers[provider].record_success()
    
    def record_failure(self, provider: str):
        """Record failed request for a provider"""
        if provider in self.circuit_breakers:
            self.circuit_breakers[provider].record_failure()
    
    def get_circuit_stats(self) -> Dict[str, Any]:
        """Get statistics for all circuit breakers"""
        stats = {}
        for provider, circuit in self.circuit_breakers.items():
            stats[provider] = circuit.get_state()
        return stats 