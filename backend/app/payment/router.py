"""
Payment endpoints for handling subscription payments via Razorpay.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from typing import Dict, Any
import json
from app.payment.service import payment_service
from app.users.service import db_service
from app.shared.config import config

router = APIRouter()

# HTML Template for Checkout
CHECKOUT_HTML_TEMPLATE = """<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PromptGrammerly - Checkout</title>
  </head>
  <body style="font-family: system-ui, sans-serif; padding: 24px; text-align: center;"> 
    <h2>Secure Checkout</h2>
    <div id="status">Initializing...</div>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
      const options = {options_json};
      options.handler = async function (response) {{
        document.getElementById('status').textContent = 'Verifying...';
        try {{
          await fetch('/api/v1/payment/verify', {{
            method: 'POST',
            headers: {{ 'Content-Type': 'application/json' }},
            body: JSON.stringify({{
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              user_email: options.prefill.email
            }})
          }});
          document.getElementById('status').textContent = 'Success! You can close this tab.';
        }} catch (e) {{
          document.getElementById('status').textContent = 'Payment successful, but verification pending.';
        }}
      }};
      new Razorpay(options).open();
    </script>
  </body>
</html>"""

@router.post("/create-order")
async def create_payment_order(request: Dict[str, Any]):
    """Create Razorpay order for pro subscription."""
    try:
        user_email = request.get("user_email")
        if not user_email: raise HTTPException(400, "Email required")
        
        order = await payment_service.create_order(user_email)
        
        return {
            "success": True,
            "order_id": order.get("order_id"),
            "amount": order.get("amount"),
            "currency": order.get("currency"),
            "key_id": order.get("key_id")
        }
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/verify")
async def verify_payment(request: Dict[str, Any]):
    """Verify payment and upgrade user."""
    try:
        # Extract & Validate
        if not all(k in request for k in ["razorpay_payment_id", "razorpay_order_id", "razorpay_signature", "user_email"]):
            raise HTTPException(400, "Missing parameters")
            
        # Verify Signature
        if not await payment_service.verify_payment(
            request["razorpay_payment_id"], 
            request["razorpay_order_id"], 
            request["razorpay_signature"]
        ):
            raise HTTPException(400, "Invalid signature")
        
        # Upgrade User
        if not await db_service.upgrade_user_to_pro(request["user_email"]):
            raise HTTPException(500, "Upgrade failed")
            
        return {"success": True, "subscription_tier": "pro"}
        
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, str(e))

@router.get("/subscription-status/{user_email}")
async def get_subscription_status(user_email: str):
    """Get subscription status."""
    return await db_service.check_user_subscription_status(user_email)

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhooks (Backup for frontend verification)."""
    try:
        signature = request.headers.get("x-razorpay-signature")
        body = await request.body()
        
        if not signature: raise HTTPException(400, "No signature")
        
        # Verify webhook
        payment_service.client.utility.verify_webhook_signature(
            body.decode(), signature, config.settings.razorpay_webhook_secret
        )
        
        data = json.loads(body)
        if data.get("event") == "payment.captured":
            email = data["payload"]["payment"]["entity"]["notes"].get("user_email")
            if email: await db_service.upgrade_user_to_pro(email)
            
        return {"status": "ok"}
    except Exception:
        raise HTTPException(400, "Webhook failed")

@router.get("/checkout-page", response_class=HTMLResponse)
async def checkout_page(order_id: str, user_email: str):
    """Serve hosted checkout page."""
    if not payment_service.client:
        return HTMLResponse("Payment config missing", 500)

    options = {
        "key": payment_service.key_id,
        "amount": 500,
        "currency": "USD",
        "name": "PromptGrammerly",
        "description": "Pro Subscription",
        "order_id": order_id,
        "prefill": {"email": user_email},
        "theme": {"color": "#000000"}
    }

    # Inject JSON options into template
    html = CHECKOUT_HTML_TEMPLATE.replace("{options_json}", json.dumps(options))
    return HTMLResponse(html)
