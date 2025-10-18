#!/usr/bin/env python3
"""
Test script for live Razorpay payment system.
Run this after updating your .env file with live credentials.
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.config import config
from app.services.payment_service import payment_service
from app.utils.database import db_service

async def test_payment_system():
    """Test the complete payment system with live credentials."""
    
    print("🚀 Testing Live Payment System")
    print("=" * 50)
    
    # 1. Check configuration
    print("\n1️⃣ Checking Configuration...")
    print(f"   Environment: {config.settings.environment}")
    print(f"   Debug Mode: {config.settings.debug}")
    print(f"   Razorpay Key ID: {config.settings.razorpay_key_id[:10]}..." if config.settings.razorpay_key_id else "Not configured")
    print(f"   Razorpay Secret: {'✅ Configured' if config.settings.razorpay_secret_key else '❌ Not configured'}")
    print(f"   Webhook Secret: {'✅ Configured' if config.settings.razorpay_webhook_secret else '❌ Not configured'}")
    
    # 2. Test Razorpay client initialization
    print("\n2️⃣ Testing Razorpay Client...")
    if payment_service.client:
        print("   ✅ Razorpay client initialized successfully")
    else:
        print("   ❌ Razorpay client failed to initialize")
        return False
    
    # 3. Test order creation
    print("\n3️⃣ Testing Order Creation...")
    try:
        test_email = f"test_{int(datetime.now().timestamp())}@example.com"
        order = await payment_service.create_order(test_email, 500)  # $5.00
        
        print(f"   ✅ Order created successfully")
        print(f"   Order ID: {order['order_id']}")
        print(f"   Amount: ${order['amount']/100}")
        print(f"   Currency: {order['currency']}")
        print(f"   Receipt: {order['receipt']}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Order creation failed: {e}")
        return False

async def test_database_connection():
    """Test database connection and user management."""
    
    print("\n4️⃣ Testing Database Connection...")
    try:
        # Test database connection
        test_email = f"test_{int(datetime.now().timestamp())}@example.com"
        
        # Check if we can create/check user
        subscription_status = await db_service.check_user_subscription_status(test_email)
        print(f"   ✅ Database connection successful")
        print(f"   Test user subscription: {subscription_status.get('subscription_tier', 'free')}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Database connection failed: {e}")
        return False

async def main():
    """Run all tests."""
    
    print("🎯 PromptGrammerly Live Payment System Test")
    print("=" * 60)
    
    # Test payment system
    payment_ok = await test_payment_system()
    
    # Test database
    db_ok = await test_database_connection()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"Payment System: {'✅ PASS' if payment_ok else '❌ FAIL'}")
    print(f"Database: {'✅ PASS' if db_ok else '❌ FAIL'}")
    
    if payment_ok and db_ok:
        print("\n🎉 ALL TESTS PASSED! Your payment system is ready for production!")
        print("\nNext steps:")
        print("1. Deploy your application to production")
        print("2. Update webhook URL in Razorpay dashboard")
        print("3. Test with real payment (small amount)")
    else:
        print("\n⚠️  Some tests failed. Please check your configuration.")
        print("Make sure your .env file has the correct live Razorpay credentials.")

if __name__ == "__main__":
    asyncio.run(main())
