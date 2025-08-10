"""
Payment endpoints for handling subscription payments via Razorpay.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
import logging
from app.services.payment_service import payment_service
from app.services.database import db_service


logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create-order")
async def create_payment_order(request: Dict[str, Any]):
    """
    Create Razorpay order for pro subscription.
    
    Body:
        {
            "user_email": "user@example.com"
        }
    
    Returns:
        {
            "success": true,
            "order": {
                "order_id": "order_xyz123",
                "amount": 500,
                "currency": "USD",
                "key_id": "rzp_test_xyz"
            }
        }
    """
    try:
        user_email = request.get("user_email")
        if not user_email:
            raise HTTPException(status_code=400, detail="user_email is required")
        
        # Create Razorpay order
        order = await payment_service.create_order(user_email)
        
        logger.info(f"✅ Payment order created for {user_email}")
        
        return {
            "success": True,
            "order": order
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create payment order: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create payment order: {str(e)}"
        )

@router.post("/verify")
async def verify_payment(request: Dict[str, Any]):
    """
    Verify payment and upgrade user to pro subscription.
    
    Body:
        {
            "razorpay_payment_id": "pay_xyz123",
            "razorpay_order_id": "order_xyz123", 
            "razorpay_signature": "signature_xyz",
            "user_email": "user@example.com"
        }
    
    Returns:
        {
            "success": true,
            "user_email": "user@example.com",
            "subscription_tier": "pro",
            "expires_at": "2024-02-15T10:30:00Z"
        }
    """
    try:
        # Extract payment data
        payment_id = request.get("razorpay_payment_id")
        order_id = request.get("razorpay_order_id")
        signature = request.get("razorpay_signature")
        user_email = request.get("user_email")
        
        # Validate required fields
        if not all([payment_id, order_id, signature, user_email]):
            raise HTTPException(
                status_code=400, 
                detail="Missing required payment parameters"
            )
        
        # Verify payment signature with Razorpay
        is_valid = await payment_service.verify_payment(payment_id, order_id, signature)
        
        if not is_valid:
            logger.warning(f"❌ Invalid payment signature for {user_email}")
            raise HTTPException(
                status_code=400, 
                detail="Invalid payment signature"
            )
        
        # Upgrade user to pro subscription
        success = await db_service.upgrade_user_to_pro(user_email)
        
        if not success:
            logger.error(f"❌ Failed to upgrade user {user_email} to pro")
            raise HTTPException(
                status_code=500, 
                detail="Failed to upgrade user subscription"
            )
        
        # Get updated user subscription status
        subscription_status = await db_service.check_user_subscription_status(user_email)
        
        logger.info(f"✅ User {user_email} successfully upgraded to pro")
        
        return {
            "success": True,
            "user_email": user_email,
            "subscription_tier": subscription_status.get('subscription_tier'),
            "expires_at": subscription_status.get('subscription_expires')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Payment verification failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Payment verification failed: {str(e)}"
        )

@router.get("/subscription-status/{user_email}")
async def get_subscription_status(user_email: str):
    """
    Get user's current subscription status.
    
    Returns:
        {
            "subscription_tier": "free|pro",
            "daily_prompts_used": 3,
            "daily_limit": 5,
            "subscription_expires": "2024-02-15T10:30:00Z"
        }
    """
    try:
        status = await db_service.check_user_subscription_status(user_email)
        return status
        
    except Exception as e:
        logger.error(f"❌ Failed to get subscription status for {user_email}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get subscription status"
        )

@router.post("/webhook")
async def razorpay_webhook(request: Dict[str, Any]):
    """
    Handle Razorpay webhook notifications.
    
    This endpoint receives payment status updates from Razorpay.
    Currently logs events for monitoring purposes.
    """
    try:
        event = request.get("event")
        payload = request.get("payload", {})
        
        logger.info(f"📡 Razorpay webhook received: {event}")
        
        if event == "payment.captured":
            payment = payload.get("payment", {})
            user_email = payment.get("notes", {}).get("user_email")
            amount = payment.get("amount", 0)
            
            logger.info(f"💰 Payment captured: {user_email} - ${amount/100}")
            
            # Additional webhook processing can be added here
            # For now, payment verification is handled in /verify endpoint
        
        return {"status": "received"}
        
    except Exception as e:
        logger.error(f"❌ Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")
