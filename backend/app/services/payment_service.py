"""
Payment service for handling Razorpay transactions and subscription management.
"""
import razorpay
import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
from app.core.config import config

logger = logging.getLogger(__name__)

class PaymentService:
    """Service for handling payment operations with Razorpay."""
    
    def __init__(self):
        """Initialize payment service with Razorpay credentials."""
        self.key_id = config.settings.razorpay_key_id
        self.secret_key = config.settings.razorpay_secret_key
        
        logger.info(f"🔑 Razorpay Key ID: {self.key_id[:10]}..." if self.key_id else "None")
        logger.info(f"🔑 Razorpay Secret Key: {self.secret_key[:10]}..." if self.secret_key else "None")
        
        if not self.key_id or not self.secret_key:
            logger.warning("⚠️ Razorpay credentials not configured")
            self.client = None
        else:
            try:
                self.client = razorpay.Client(auth=(self.key_id, self.secret_key))
                logger.info("✅ Razorpay client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Razorpay client: {e}")
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
            order_data = {
                'amount': amount,  # Amount in cents
                'currency': 'USD',
                'receipt': f'sub_{user_email}_{int(datetime.now().timestamp())}',
                'notes': {
                    'user_email': user_email,
                    'subscription_type': 'monthly_pro',
                    'plan': 'pro_monthly'
                }
            }
            
            order = self.client.order.create(data=order_data)
            logger.info(f"✅ Created order {order['id']} for {user_email} - ${amount/100}")
            
            return {
                'order_id': order['id'],
                'amount': order['amount'],
                'currency': order['currency'],
                'receipt': order['receipt'],
                'key_id': self.key_id  # Frontend needs this for checkout
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create order for {user_email}: {e}")
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
            logger.info(f"✅ Payment verified successfully: {payment_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Payment verification failed for {payment_id}: {e}")
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
            logger.error(f"❌ Failed to fetch payment details for {payment_id}: {e}")
            return None

# Global payment service instance
payment_service = PaymentService()
