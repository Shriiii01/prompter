"""
Payment endpoints for handling subscription payments via Razorpay.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse
from typing import Dict, Any
import logging
import json
from app.services.payment_service import payment_service
from app.utils.database import db_service
from app.core.config import config


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
        
        # Flatten response to match extension expectations
        return {
            "success": True,
            "order_id": order.get("order_id"),
            "amount": order.get("amount"),
            "currency": order.get("currency"),
            "key_id": order.get("key_id"),
            "receipt": order.get("receipt")
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
            "daily_limit": 10,
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
async def razorpay_webhook(request: Request):
    """
    Handle Razorpay webhook notifications.
    
    This endpoint receives payment status updates from Razorpay.
    Acts as a backup to ensure users get upgraded even if frontend fails.
    """
    try:
        # Verify webhook signature for security
        webhook_signature = request.headers.get("x-razorpay-signature")
        if not webhook_signature:
            logger.warning("❌ Missing webhook signature")
            raise HTTPException(status_code=400, detail="Missing webhook signature")
        
        # Get raw body for signature verification
        raw_body = await request.body()
        raw_body_str = raw_body.decode("utf-8")
        
        # Verify webhook signature with Razorpay
        try:
            if not payment_service.client:
                raise Exception("Razorpay client not initialized")
            payment_service.client.utility.verify_webhook_signature(
                raw_body_str,
                webhook_signature,
                config.settings.razorpay_webhook_secret
            )
        except Exception as e:
            logger.warning(f"❌ Invalid webhook signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
        
        # Parse JSON payload
        try:
            payload_json = json.loads(raw_body_str)
        except Exception:
            payload_json = {}
        
        event = payload_json.get("event")
        payload = payload_json.get("payload", {})
        
        logger.info(f"📡 Razorpay webhook received: {event}")
        
        if event == "payment.captured":
            payment = payload.get("payment", {})
            user_email = payment.get("notes", {}).get("user_email")
            amount = payment.get("amount", 0)
            payment_id = payment.get("id")
            order_id = payment.get("order_id")
            
            logger.info(f"💰 Payment captured: {user_email} - ${amount/100}")
            
            if user_email:
                # Auto-upgrade user to pro (backup to frontend verification)
                try:
                    success = await db_service.upgrade_user_to_pro(user_email)
                    if success:
                        logger.info(f"✅ User {user_email} auto-upgraded via webhook")
                    else:
                        logger.warning(f"⚠️ Failed to auto-upgrade {user_email} via webhook")
                except Exception as e:
                    logger.error(f"❌ Webhook auto-upgrade failed for {user_email}: {e}")
        
        elif event == "payment.failed":
            payment = payload.get("payment", {})
            user_email = payment.get("notes", {}).get("user_email")
            error_code = payment.get("error_code")
            error_description = payment.get("error_description")
            
            logger.warning(f"❌ Payment failed: {user_email} - {error_code}: {error_description}")
        
        elif event == "order.paid":
            order = payload.get("order", {})
            user_email = order.get("notes", {}).get("user_email")
            
            logger.info(f"✅ Order paid: {user_email}")
        
        return {"status": "processed", "event": event}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Webhook processing failed: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")


@router.get("/checkout-page", response_class=HTMLResponse)
async def checkout_page(order_id: str, user_email: str):
    """Serve a minimal hosted checkout page that runs outside of extension CSP.
    This page loads Razorpay's checkout.js and verifies payment with the backend.
    """
    try:
        if not payment_service.client:
            return HTMLResponse(
                content="<h3>Payment service is not configured.</h3>",
                status_code=500
            )

        key_id = payment_service.key_id or ""
        amount = 500
        currency = "USD"

        # Minimal HTML page that opens Razorpay checkout and verifies on success
        html = f"""<!DOCTYPE html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>PromptGrammerly - Secure Checkout</title>
  </head>
  <body style=\"font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;\"> 
    <h2>Secure Checkout</h2>
    <p>Opening Razorpay secure payment...</p>
    <div id=\"status\"></div>
    <script src=\"https://checkout.razorpay.com/v1/checkout.js\"></script>
    <script>
      (function() {{
        const statusEl = document.getElementById('status');
        function setStatus(text) {{ statusEl.textContent = text; }}

        const options = {{
          key: {json.dumps(key_id)},
          amount: {amount},
          currency: {json.dumps(currency)},
          name: 'PromptGrammerly',
          description: 'Unlimited Prompt Enhancements with PromptGrammerly',
          order_id: {json.dumps(order_id)},
          prefill: {{ email: {json.dumps(user_email)} }},
          handler: async function (response) {{
            try {{
              await fetch('/api/v1/payment/verify', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  user_email: {json.dumps(user_email)}
                }})
              }});
              setStatus('Payment successful! You can close this tab.');
            }} catch (e) {{
              setStatus('Payment succeeded but verification failed. You will be upgraded shortly via webhook.');
            }}
          }},
          modal: {{
            ondismiss: function() {{ setStatus('Payment window closed. If you completed the payment, you will be upgraded shortly.'); }}
          }},
          theme: {{ color: '#34C759' }}
        }};

        try {{
          const rzp = new Razorpay(options);
          rzp.open();
        }} catch (e) {{
          setStatus('Failed to initialize payment. Please try again.');
        }}
      }})();
    </script>
  </body>
</html>"""

        return HTMLResponse(content=html, status_code=200)

    except Exception as e:
        logger.error(f"❌ Failed to serve checkout page: {e}")
        return HTMLResponse(content="<h3>Failed to load checkout page.</h3>", status_code=500)
