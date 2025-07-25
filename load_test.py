#!/usr/bin/env python3
"""
Load Testing Script for AI Magic Backend
Tests the system under various load conditions
"""

import asyncio
import aiohttp
import time
import statistics
from typing import List, Dict
import json

class LoadTester:
    def __init__(self, base_url: str = "http://localhost:8004"):
        self.base_url = base_url
        self.results = []
        
    async def make_request(self, session: aiohttp.ClientSession, endpoint: str) -> Dict:
        """Make a single request and record metrics"""
        start_time = time.time()
        
        try:
            async with session.get(f"{self.base_url}{endpoint}") as response:
                response_time = time.time() - start_time
                return {
                    "endpoint": endpoint,
                    "status_code": response.status,
                    "response_time": response_time,
                    "success": response.status < 400
                }
        except Exception as e:
            response_time = time.time() - start_time
            return {
                "endpoint": endpoint,
                "status_code": 0,
                "response_time": response_time,
                "success": False,
                "error": str(e)
            }
    
    async def test_endpoint(self, endpoint: str, num_requests: int, concurrent: int = 10):
        """Test a specific endpoint with concurrent requests"""
        print(f"🧪 Testing {endpoint} with {num_requests} requests ({concurrent} concurrent)")
        
        async with aiohttp.ClientSession() as session:
            # Create semaphore to limit concurrent requests
            semaphore = asyncio.Semaphore(concurrent)
            
            async def limited_request():
                async with semaphore:
                    return await self.make_request(session, endpoint)
            
            # Create tasks
            tasks = [limited_request() for _ in range(num_requests)]
            
            # Execute all requests
            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time
            
            # Process results
            successful_requests = [r for r in results if isinstance(r, dict) and r.get("success")]
            failed_requests = [r for r in results if isinstance(r, dict) and not r.get("success")]
            
            response_times = [r["response_time"] for r in successful_requests]
            
            # Calculate statistics
            stats = {
                "endpoint": endpoint,
                "total_requests": num_requests,
                "successful_requests": len(successful_requests),
                "failed_requests": len(failed_requests),
                "success_rate": len(successful_requests) / num_requests * 100,
                "total_time": total_time,
                "requests_per_second": num_requests / total_time,
                "avg_response_time": statistics.mean(response_times) if response_times else 0,
                "min_response_time": min(response_times) if response_times else 0,
                "max_response_time": max(response_times) if response_times else 0,
                "median_response_time": statistics.median(response_times) if response_times else 0
            }
            
            self.results.append(stats)
            
            print(f"✅ {endpoint}: {stats['success_rate']:.1f}% success, {stats['requests_per_second']:.1f} req/s")
            print(f"   Avg response time: {stats['avg_response_time']*1000:.1f}ms")
            print(f"   Failed requests: {stats['failed_requests']}")
            
            return stats
    
    async def run_load_tests(self):
        """Run comprehensive load tests"""
        print("🚀 Starting Load Tests for AI Magic Backend")
        print("=" * 60)
        
        # Test 1: Health check (baseline)
        await self.test_endpoint("/api/v1/health", 100, 20)
        
        # Test 2: User count endpoint (no auth)
        await self.test_endpoint("/api/v1/user/count/shrijambhale8@gmail.com", 200, 30)
        
        # Test 3: High load test
        await self.test_endpoint("/api/v1/health", 500, 50)
        
        # Test 4: Rate limiting test (should hit limits)
        await self.test_endpoint("/api/v1/user/count/shrijambhale8@gmail.com", 1000, 100)
        
        print("\n" + "=" * 60)
        print("📊 Load Test Results Summary")
        print("=" * 60)
        
        for result in self.results:
            print(f"\n🔍 {result['endpoint']}:")
            print(f"   Success Rate: {result['success_rate']:.1f}%")
            print(f"   Requests/sec: {result['requests_per_second']:.1f}")
            print(f"   Avg Response: {result['avg_response_time']*1000:.1f}ms")
            print(f"   Failed: {result['failed_requests']}")
        
        # Overall assessment
        total_requests = sum(r['total_requests'] for r in self.results)
        total_successful = sum(r['successful_requests'] for r in self.results)
        overall_success_rate = total_successful / total_requests * 100
        
        print(f"\n🎯 Overall Assessment:")
        print(f"   Total Requests: {total_requests}")
        print(f"   Overall Success Rate: {overall_success_rate:.1f}%")
        
        if overall_success_rate > 95:
            print("   ✅ System is ready for production load!")
        elif overall_success_rate > 80:
            print("   ⚠️ System needs optimization before production")
        else:
            print("   ❌ System needs significant improvements")

async def main():
    """Main function to run load tests"""
    tester = LoadTester()
    await tester.run_load_tests()

if __name__ == "__main__":
    asyncio.run(main()) 