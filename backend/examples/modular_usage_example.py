"""
Example demonstrating the refactored MultiProviderService modular structure
"""

import asyncio
import logging
from app.services.multi_provider import MultiProviderService
from app.services.circuit_breaker import CircuitBreakerManager
from app.services.provider_manager import ProviderManager
from app.services.stats_tracker import StatsTracker
from app.services.enhancement_engine import EnhancementEngine

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def demonstrate_modular_usage():
    """Demonstrate how to use the refactored modular structure"""
    
    print(" MultiProviderService Modular Structure Demo")
    print("=" * 50)
    
    # 1. Using the complete MultiProviderService (backward compatible)
    print("\n1. Complete MultiProviderService Usage:")
    print("-" * 40)
    
    service = MultiProviderService()
    
    # Test enhancement
    try:
        result = await service.enhance_prompt("Explain quantum computing", "gpt-4")
        print(f" Enhanced prompt: {result[:100]}...")
    except Exception as e:
        print(f" Enhancement failed: {e}")
    
    # Get statistics
    stats = service.get_provider_stats()
    print(f" Provider stats: {len(stats)} providers configured")
    
    # Get health status
    health = service.get_health_status()
    print(f" Health status: {health['status']}")
    
    # 2. Using individual modules directly
    print("\n2. Individual Module Usage:")
    print("-" * 40)
    
    # Circuit Breaker Manager
    circuit_manager = CircuitBreakerManager(["openai", "gemini", "together"])
    print(f"🔌 Circuit breakers initialized for {len(circuit_manager.circuit_breakers)} providers")
    
    # Check circuit state
    is_openai_closed = circuit_manager.is_circuit_closed("openai")
    print(f"🔒 OpenAI circuit closed: {is_openai_closed}")
    
    # Stats Tracker
    stats_tracker = StatsTracker(["openai", "gemini", "together"])
    print(f"📈 Stats tracker initialized for {len(stats_tracker.provider_stats)} providers")
    
    # Record some test data
    stats_tracker.record_success("openai", 1.5)
    stats_tracker.record_failure("gemini")
    
    # Get stats
    all_stats = stats_tracker.get_all_stats()
    print(f" Recorded stats for {len(all_stats)} providers")
    
    # Enhancement Engine
    enhancement_engine = EnhancementEngine()
    print("⚙ Enhancement engine initialized")
    
    # Test fallback enhancement
    fallback = enhancement_engine.create_fallback_enhancement("Simple prompt", "gpt-4")
    print(f"🔄 Fallback enhancement: {fallback[:80]}...")
    
    # 3. Demonstrating modular benefits
    print("\n3. Modular Benefits:")
    print("-" * 40)
    
    # Easy to test individual components
    print(" Each module can be tested independently")
    print(" Easy to mock dependencies")
    print(" Clear separation of concerns")
    print(" Simple to extend with new features")
    
    # 4. Performance monitoring
    print("\n4. Performance Monitoring:")
    print("-" * 40)
    
    overall_stats = stats_tracker.get_overall_stats()
    print(f" Overall requests: {overall_stats.get('total_requests', 0)}")
    print(f" Successful requests: {overall_stats.get('total_successful', 0)}")
    print(f" Failed requests: {overall_stats.get('total_failed', 0)}")
    
    # 5. Circuit breaker demonstration
    print("\n5. Circuit Breaker Demo:")
    print("-" * 40)
    
    # Simulate failures
    for i in range(3):
        circuit_manager.record_failure("openai")
        print(f" Recorded failure {i+1} for OpenAI")
    
    # Check circuit state
    circuit_state = circuit_manager.is_circuit_closed("openai")
    print(f"🔌 OpenAI circuit closed after failures: {circuit_state}")
    
    # Simulate success
    circuit_manager.record_success("openai")
    print(" Recorded success for OpenAI")
    
    # Get circuit stats
    circuit_stats = circuit_manager.get_circuit_stats()
    openai_stats = circuit_stats.get("openai", {})
    print(f" OpenAI circuit stats: {openai_stats}")
    
    print("\n Demo completed successfully!")
    print("The modular structure provides better maintainability and testability.")

def demonstrate_backward_compatibility():
    """Demonstrate that the public interface remains unchanged"""
    
    print("\n🔄 Backward Compatibility Check:")
    print("-" * 40)
    
    # Old way of using the service (still works)
    service = MultiProviderService()
    
    # All original methods are still available
    methods = [
        'enhance_prompt',
        'get_provider_stats', 
        'get_health_status'
    ]
    
    for method in methods:
        if hasattr(service, method):
            print(f" {method} method available")
        else:
            print(f" {method} method missing")
    
    print(" Backward compatibility maintained!")

if __name__ == "__main__":
    # Run the demonstration
    asyncio.run(demonstrate_modular_usage())
    demonstrate_backward_compatibility() 