"""
Payment service for handling Razorpay transactions and subscription management.
"""
import razorpay
from typing import Dict, Optional
from datetime import datetime, timedelta
from app.shared.config import config

class PaymentService:
    """Service for handling payment operations with Razorpay."""
    
    def __init__(self):
        """Initialize payment service with Razorpay credentials."""
        self.key_id = config.settings.razorpay_key_id
        self.secret_key = config.settings.razorpay_secret_key
        
        if not self.key_id or not self.secret_key:
            self.client = None
        else:
            try:
                self.client = razorpay.Client(auth=(self.key_id, self.secret_key))
            except Exception as e:
                self.client = None
    
    async def create_order(self, user_email: str, amount: int = 500) -> Dict:
        """
        Create Razorpay order for subscription payment.
        
        Args:
            user_email: User's email address
            amount: Amount in cents (default: 500 = $5.00)
            
        Returns:
            Dict containing order details
        """
        if not self.client:
            raise Exception("Razorpay client not initialized")
        
        try:
            # Create a short receipt ID (max 40 chars for Razorpay)
            # Use first 8 chars of email + timestamp for uniqueness
            email_prefix = user_email.split('@')[0][:8]  # First 8 chars before @
            timestamp = int(datetime.now().timestamp())
            receipt_id = f'sub_{email_prefix}_{timestamp}'[:40]  # Ensure max 40 chars
            
            order_data = {
                'amount': amount,  # Amount in cents
                'currency': 'USD',
                'receipt': receipt_id,
                'notes': {
                    'user_email': user_email,
                    'subscription_type': 'monthly_pro',
                    'plan': 'pro_monthly'
                }
            }
            
            order = self.client.order.create(data=order_data)
            
            return {
                'order_id': order['id'],
                'amount': order['amount'],
                'currency': order['currency'],
                'receipt': order['receipt'],
                'key_id': self.key_id  # Frontend needs this for checkout
            }
            
        except Exception as e:
            raise Exception(f"Payment order creation failed: {str(e)}")
    
    async def verify_payment(self, payment_id: str, order_id: str, signature: str) -> bool:
        """
        Verify Razorpay payment signature for security.
        
        Args:
            payment_id: Razorpay payment ID
            order_id: Razorpay order ID
            signature: Payment signature from Razorpay
            
        Returns:
            True if payment is valid, False otherwise
        """
        if not self.client:
            raise Exception("Razorpay client not initialized")
        
        try:
            params_dict = {
                'razorpay_payment_id': payment_id,
                'razorpay_order_id': order_id,
                'razorpay_signature': signature
            }
            
            # This will raise an exception if signature is invalid
            self.client.utility.verify_payment_signature(params_dict)
            return True
            
        except Exception as e:
            return False
    
    async def get_payment_details(self, payment_id: str) -> Optional[Dict]:
        """
        Get payment details from Razorpay.
        
        Args:
            payment_id: Razorpay payment ID
            
        Returns:
            Payment details dict or None if not found
        """
        if not self.client:
            raise Exception("Razorpay client not initialized")
        
        try:
            payment = self.client.payment.fetch(payment_id)
            return {
                'id': payment['id'],
                'amount': payment['amount'],
                'status': payment['status'],
                'method': payment['method'],
                'email': payment.get('email'),
                'created_at': payment['created_at']
            }
        except Exception as e:
            return None

# Global payment service instance
payment_service = PaymentService()
