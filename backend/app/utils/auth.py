import jwt
import requests
from typing import Optional, Dict, Any
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google.auth import default
import logging

logger = logging.getLogger(__name__)

# Google OAuth configuration
GOOGLE_CLIENT_ID = "20427090028-asq8b7s849pq95li1hkmc7vrq1qeertg.apps.googleusercontent.com"

def get_email_from_token(authorization: str) -> str:
    """
    Extract user email from Google OAuth access token
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        User email address
        
    Raises:
        ValueError: If token is invalid or email cannot be extracted
    """
    try:
        # Remove 'Bearer ' prefix
        if authorization.startswith('Bearer '):
            token = authorization[7:]
        else:
            token = authorization
            
        # Use the access token to get user info from Google API
        response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if response.status_code != 200:
            raise ValueError(f"Failed to verify token: {response.status_code}")
            
        user_info = response.json()
        
        # Extract email
        email = user_info.get('email')
        if not email:
            raise ValueError("No email found in token response")
            
        logger.info(f" Authenticated user: {email}")
        return email
        
    except Exception as e:
        logger.error(f" Authentication failed: {str(e)}")
        raise ValueError(f"Invalid authentication token: {str(e)}")

def get_user_info_from_token(authorization: str) -> Dict[str, Any]:
    """
    Extract user information from Google OAuth access token
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        Dictionary containing user information (email, name, picture, etc.)
        
    Raises:
        ValueError: If token is invalid or user info cannot be extracted
    """
    try:
        # Remove 'Bearer ' prefix
        if authorization.startswith('Bearer '):
            token = authorization[7:]
        else:
            token = authorization
            
        # Use the access token to get user info from Google API
        response = requests.get(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            headers={'Authorization': f'Bearer {token}'}
        )
        
        if response.status_code != 200:
            raise ValueError(f"Failed to verify token: {response.status_code}")
            
        user_info = response.json()
        
        # Map Google API response to our format
        formatted_user_info = {
            'email': user_info.get('email'),
            'name': user_info.get('name'),
            'picture': user_info.get('picture'),
            'given_name': user_info.get('given_name'),
            'family_name': user_info.get('family_name'),
            'sub': user_info.get('id'),  # Google user ID
            'email_verified': user_info.get('verified_email', False)
        }
        
        if not formatted_user_info['email']:
            raise ValueError("No email found in token response")
            
        logger.info(f" User info extracted: {formatted_user_info['email']}")
        return formatted_user_info
        
    except Exception as e:
        logger.error(f" User info extraction failed: {str(e)}")
        raise ValueError(f"Invalid authentication token: {str(e)}")

def verify_token_validity(authorization: str) -> bool:
    """
    Verify if the provided token is valid
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        True if token is valid, False otherwise
    """
    try:
        get_email_from_token(authorization)
        return True
    except:
        return False

def extract_token_from_header(authorization: str) -> str:
    """
    Extract token from Authorization header
    
    Args:
        authorization: Authorization header value
        
    Returns:
        Clean token string
        
    Raises:
        ValueError: If header format is invalid
    """
    if not authorization:
        raise ValueError("No authorization header provided")
        
    if authorization.startswith('Bearer '):
        return authorization[7:]
    else:
        return authorization 