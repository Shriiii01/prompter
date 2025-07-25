"""
Google Authentication Utilities
Handles verification of Google ID tokens from Chrome extension
"""

from fastapi import HTTPException, status
from google.oauth2 import id_token
from google.auth.transport import requests
import logging

logger = logging.getLogger(__name__)

# Your Google OAuth Client ID from the Chrome extension
GOOGLE_CLIENT_ID = "20427090028-asq8b7s849pq95li1hkmc7vrq1qeertg.apps.googleusercontent.com"

def get_email_from_token(auth_header: str) -> str:
    """
    Verify Google ID token and extract user email
    
    Args:
        auth_header: Authorization header containing "Bearer <token>"
        
    Returns:
        str: Verified user email
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Missing or invalid authorization header. Expected 'Bearer <token>'"
        )

    token = auth_header.split(" ")[1]
    
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract email from verified token
        email = idinfo.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email not found in token"
            )
            
        # Log successful verification (without sensitive data)
        logger.info(f"Successfully verified Google token for user: {email}")
        
        return email
        
    except ValueError as e:
        logger.warning(f"Invalid Google token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    except Exception as e:
        logger.error(f"Error verifying Google token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
        )

def get_user_info_from_token(auth_header: str) -> dict:
    """
    Verify Google ID token and extract full user information
    
    Args:
        auth_header: Authorization header containing "Bearer <token>"
        
    Returns:
        dict: User information including email, name, picture, etc.
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Missing or invalid authorization header. Expected 'Bearer <token>'"
        )

    token = auth_header.split(" ")[1]
    
    try:
        # Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user information
        user_info = {
            "email": idinfo.get("email"),
            "name": idinfo.get("name"),
            "picture": idinfo.get("picture"),
            "given_name": idinfo.get("given_name"),
            "family_name": idinfo.get("family_name"),
            "email_verified": idinfo.get("email_verified", False),
            "sub": idinfo.get("sub")  # Google user ID
        }
        
        if not user_info["email"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email not found in token"
            )
            
        # Log successful verification (without sensitive data)
        logger.info(f"Successfully verified Google token for user: {user_info['email']}")
        
        return user_info
        
    except ValueError as e:
        logger.warning(f"Invalid Google token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )
    except Exception as e:
        logger.error(f"Error verifying Google token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed"
        ) 