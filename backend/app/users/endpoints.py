from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

# FIX: Import the SHARED instance, don't create a new one!
from app.users.database import db_service

router = APIRouter(tags=["users"])

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
    Login/Register: Check if user exists by email. If yes, return their data. If no, create them.
    """
    print(f"📥 POST /users - email: {request.email}")
    
    try:
        # Step 1: Check if user already exists (by EMAIL only)
        existing_user = await db_service.get_user_stats(request.email)
        
        if existing_user:
            print(f"✅ User found: {request.email} (prompts: {existing_user.get('enhanced_prompts', 0)})")
            return UserResponse(
                id=str(existing_user.get("id", "")),
                email=existing_user.get("email", request.email),
                name=existing_user.get("name") or request.name,
                enhanced_prompts=existing_user.get("enhanced_prompts", 0),
                created_at=str(existing_user.get("created_at", ""))
            )
        
        # Step 2: User doesn't exist, create them
        print(f"🆕 Creating new user: {request.email}")
        user_data = {
            "email": request.email,
            "name": request.name,
            "enhanced_prompts": 0
        }
        
        new_user = await db_service.get_or_create_user(request.email, user_data)
        
        if not new_user:
            print(f"❌ Failed to create user: {request.email}")
            raise HTTPException(status_code=500, detail="Database failed to create user")
        
        print(f"✅ User created: {request.email}")
        return UserResponse(
            id=str(new_user.get("id", "")),
            email=new_user.get("email", request.email),
            name=new_user.get("name") or request.name,
            enhanced_prompts=new_user.get("enhanced_prompts", 0),
            created_at=str(new_user.get("created_at", ""))
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in create_user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@router.get("/users/{email}")
async def get_user_by_email(email: str):
    """
    Get user details by email. Creates user if not found (fallback for failed login POST).
    """
    print(f"📥 GET /users/{email}")
    
    try:
        user = await db_service.get_user_stats(email)
        
        # If user doesn't exist, create them (defensive fallback)
        if not user:
            print(f"🆕 User not found, auto-creating: {email}")
            user = await db_service.get_or_create_user(email, {
                "email": email,
                "name": "User",
                "enhanced_prompts": 0
            })
        
        if not user:
            print(f"❌ Failed to get/create user: {email}")
            raise HTTPException(status_code=500, detail="Failed to get/create user")
        
        print(f"✅ User ready: {email} (prompts: {user.get('enhanced_prompts', 0)})")
        return UserResponse(
            id=str(user.get("id", "")),
            email=user.get("email", email),
            name=user.get("name") or "User",
            enhanced_prompts=user.get("enhanced_prompts", 0),
            created_at=str(user.get("created_at", ""))
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_user_by_email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")

@router.post("/users/{email}/increment", response_model=UserResponse)
async def increment_user_count(email: str):
    """
    Add +1 to user's enhanced prompts count.
    """
    print(f"📥 POST /users/{email}/increment")
    
    try:
        # Increment the count (this also creates user if missing)
        new_count = await db_service.increment_user_prompts(email)
        print(f"✅ Incremented count for {email}: now {new_count}")
        
        # Get updated user data
        user_data = await db_service.get_user_stats(email)
        if not user_data:
            print(f"❌ User not found after increment: {email}")
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(
            id=str(user_data.get('id', '')),
            email=email,
            name=user_data.get('name') or 'User',
            enhanced_prompts=user_data.get('enhanced_prompts', 0),
            created_at=str(user_data.get('created_at', ''))
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in increment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to increment: {str(e)}")