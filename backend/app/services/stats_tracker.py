import time
import logging
from typing import Dict, Any
from enum import Enum

logger = logging.getLogger(__name__)

class ProviderType(Enum):
    """Available AI providers"""
    OPENAI = "openai"
    GEMINI = "gemini"
    TOGETHER = "together"

class StatsTracker:
    """
    Tracks performance statistics for multiple providers
    """
    
    def __init__(self, providers: list):
        self.provider_stats = {}
        self._initialize_stats(providers)
    
    def _initialize_stats(self, providers: list):
        """Initialize statistics tracking for each provider"""
        for provider in providers:
            self.provider_stats[provider] = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'average_response_time': 0.0,
                'total_response_time': 0.0,
                'last_request_time': None
            }
    
    def record_success(self, provider: str, response_time: float):
        """Record successful request for a provider"""
        if provider not in self.provider_stats:
            return
        
        stats = self.provider_stats[provider]
        stats['total_requests'] += 1
        stats['successful_requests'] += 1
        stats['total_response_time'] += response_time
        stats['average_response_time'] = stats['total_response_time'] / stats['successful_requests']
        stats['last_request_time'] = time.time()
    
    def record_failure(self, provider: str):
        """Record failed request for a provider"""
        if provider not in self.provider_stats:
            return
        
        stats = self.provider_stats[provider]
        stats['total_requests'] += 1
        stats['failed_requests'] += 1
        stats['last_request_time'] = time.time()
    
    def get_provider_stats(self, provider: str) -> Dict[str, Any]:
        """Get statistics for a specific provider"""
        if provider not in self.provider_stats:
            return {}
        
        stats = self.provider_stats[provider]
        return {
            'total_requests': stats['total_requests'],
            'successful_requests': stats['successful_requests'],
            'failed_requests': stats['failed_requests'],
            'average_response_time': stats['average_response_time'],
            'success_rate': (stats['successful_requests'] / stats['total_requests'] * 100) if stats['total_requests'] > 0 else 0.0,
            'last_request_time': stats['last_request_time']
        }
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all providers"""
        stats = {}
        for provider in self.provider_stats:
            stats[provider] = self.get_provider_stats(provider)
        return stats
    
    def get_overall_stats(self) -> Dict[str, Any]:
        """Get overall statistics across all providers"""
        total_requests = 0
        total_successful = 0
        total_failed = 0
        total_response_time = 0.0
        successful_requests_count = 0
        
        for stats in self.provider_stats.values():
            total_requests += stats['total_requests']
            total_successful += stats['successful_requests']
            total_failed += stats['failed_requests']
            total_response_time += stats['total_response_time']
            successful_requests_count += stats['successful_requests']
        
        return {
            'total_requests': total_requests,
            'total_successful': total_successful,
            'total_failed': total_failed,
            'overall_success_rate': (total_successful / total_requests * 100) if total_requests > 0 else 0.0,
            'average_response_time': (total_response_time / successful_requests_count) if successful_requests_count > 0 else 0.0
        }
    
    def reset_stats(self, provider: str = None):
        """Reset statistics for a provider or all providers"""
        if provider:
            if provider in self.provider_stats:
                self._initialize_stats([provider])
        else:
            self._initialize_stats(list(self.provider_stats.keys())) 