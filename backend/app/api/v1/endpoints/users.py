import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from ....utils.database import database_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["users-v1"])

class UserCreateRequest(BaseModel):
    """Request model for creating a user."""
    email: EmailStr
    name: str

class UserResponse(BaseModel):
    """Response model for user data."""
    id: str
    email: str
    name: str
    enhanced_prompts: int = 0
    created_at: str

@router.post("/users", response_model=UserResponse)
async def create_user(request: UserCreateRequest):
    """
    Create a new user in the database.
    
    Args:
        request: User creation request with email and name
    
    Returns:
        Created user data
    """
    try:
        logger.info(f"Creating user: {request.email}")
        
        # Check if user already exists
        existing_user = await database_service.get_user_stats(request.email)
        if existing_user:
            logger.info(f"User already exists: {request.email}")
            return UserResponse(
                id=existing_user["id"],
                email=existing_user["email"],
                name=existing_user["name"],
                enhanced_prompts=existing_user["enhanced_prompts"],
                created_at=existing_user["created_at"]
            )
        
        # Create new user
        user_data = {
            "email": request.email,
            "name": request.name,
            "enhanced_prompts": 0
        }
        
        new_user = await database_service.get_or_create_user(request.email, user_data)
        
        logger.info(f"User created successfully: {request.email}")
        return UserResponse(
            id=new_user["id"],
            email=new_user["email"],
            name=new_user["name"],
            enhanced_prompts=new_user["enhanced_prompts"],
            created_at=new_user["created_at"]
        )
        
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.get("/users/{email}")
async def get_user_by_email(email: str):
    """
    Get user by email address.
    
    Args:
        email: User's email address
    
    Returns:
        User data if found
    """
    try:
        user = await database_service.get_user_stats(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            enhanced_prompts=user["enhanced_prompts"],
            created_at=user["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(status_code=500, detail="Failed to get user")
