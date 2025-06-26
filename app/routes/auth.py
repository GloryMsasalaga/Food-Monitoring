from fastapi import APIRouter, Depends, HTTPException, Response, status, Request, BackgroundTasks
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from app.utils import templates
from fastapi.responses import RedirectResponse, HTMLResponse
import uuid
import secrets
from datetime import datetime, timedelta

from app.models import Student
from app.schema import LoginRequest, TokenResponse , TokenRefreshRequest
from app.security import verify_password, create_access_token, verify_reset_token, hash_password , verify_refresh_token, create_refresh_token
from app.schema import LoginRequest, TokenResponse, TokenRefreshRequest, PasswordResetRequest
from app.security import verify_password, create_access_token, create_refresh_token, hash_password, verify_refresh_token
from app.database import get_db
from app import models, schema, database, security
from app.security import get_current_user
from app.schema import UserInfo

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# -------------------------------
# Login endpoint
# -------------------------------
@router.post("/login", response_model=TokenResponse)
def login_student(login: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate user and return a JWT access token.
    """
    # Find student by email
    student = db.query(Student).filter(Student.email == login.email).first()
    
    # Validate credentials
    if not student or not verify_password(login.password, student.user_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid credentials")
    
    # Create token with email and role
    access_token = create_access_token(data={"sub": student.email, "role": student.role})
    refresh_token = create_refresh_token(data={"sub": student.email})
    
     # Set cookies
    response.set_cookie(
        key="access_token", 
        value=f"Bearer {access_token}", 
        httponly=True, 
        max_age=3600,
        samesite="lax",
        secure=True  # Set to False if not using HTTPS in development
    )
    
    response.set_cookie(
        key="refresh_token", 
        value=refresh_token, 
        httponly=True, 
        max_age=7*24*3600,  # 7 days
        samesite="lax",
        secure=True  # Set to False if not using HTTPS in development
    )
    
    # Return token
    return {"access_token": access_token, "refresh_token": refresh_token
            }


# -------------------------------
# Signup endpoint
# -------------------------------
@router.post("/signup", response_model=schema.StudentOut)
def signup(student: schema.StudentSignup, db: Session = Depends(database.get_db)):
    # Check if email already exists
    existing_user = db.query(models.Student).filter(models.Student.email == student.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash the password
    hashed_password = security.hash_password(student.user_password)
    student.user_password = hashed_password

    # Create new student instance
    new_student = models.Student(**student.model_dump())
    print(str(new_student))
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

# -------------------------------
# Refresh Token endpoint
# -------------------------------
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: TokenRefreshRequest, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    email = verify_refresh_token(refresh_token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Issue new access token
    new_access_token = create_access_token(data={"sub": email})
    
    # Set new access token in cookie
    response.set_cookie(
        key="access_token", 
        value=f"Bearer {new_access_token}", 
        httponly=True, 
        max_age=3600,
        samesite="lax",
        secure=True  # Set to False if not using HTTPS in development
    )
    
    return {
        "access_token": new_access_token,
        "refresh_token": request.refresh_token
    }


@router.get("/current_user", response_model=UserInfo)
async def get_current_user_info(current_user: Student = Depends(get_current_user)):
    """Returns current user information based on JWT token"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Return user information including the UUID
    return current_user
    