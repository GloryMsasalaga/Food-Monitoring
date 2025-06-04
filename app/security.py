# app/security.py

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.models import Student

# ------------------------------
# Authentication Setup
# ------------------------------

# Extract token from the "Authorization" header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "60371ab1e0beda7311dbeb45355a945ed73eaf0516952ef9fb501155c8e3fa19"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# ------------------------------
# Password Utilities
# ------------------------------

# Hash a plaintext password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Verify a plaintext password against a hash
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# ------------------------------
# JWT Token Utilities
# ------------------------------

# Create a JWT token for a user with expiration
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Decode and validate a JWT token
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

# ------------------------------
# User Identity & Role Access
# ------------------------------

# -------------------------------
# Cookie authentication
# -------------------------------
def get_token_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    # Extract the token if it has Bearer prefix
    if token.startswith("Bearer "):
        token = token[7:]
        
    return token

# Get the current authenticated student from JWT token
def get_current_user(token: str = Depends(get_token_from_cookie), db: Session = Depends(get_db)) -> Student:
    try:
        payload = verify_token(token)
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        student = db.query(Student).filter(Student.email == email).first()
        if not student:
            raise HTTPException(status_code=404, detail="User not found")
        return student
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ------------------------------
# Role-Based Access Control (RBAC)
# ------------------------------

# Require the user to have role='admin'
def require_admin(current_user: Student = Depends(get_current_user)) -> Student:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Require the user to have role='student'
def require_user(current_user: Student = Depends(get_current_user)) -> Student:
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user

# Generic role checker dependency — use with any role string
def role_required(required_role: str):
    def role_checker(current_user: Student = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: {required_role} role required"
            )
        return current_user
    return role_checker


# Config (you may move these to a config file)
RESET_SECRET_KEY = "FfOgGTpgJh-v8FsR-oHU5hjC4T3a24ixjX2hIlewaiJRemBAVsHm_YmIrckFXwcIDlp2IvAVa_FliCmJ7Z2cYw"
RESET_ALGORITHM = "HS256"
RESET_TOKEN_EXPIRE_MINUTES = 15


def create_reset_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, RESET_SECRET_KEY, algorithm=RESET_ALGORITHM)

def verify_reset_token(token: str):
    try:
        payload = jwt.decode(token, RESET_SECRET_KEY, algorithms=[RESET_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None


# Refresh token configuration
REFRESH_SECRET_KEY = "0Ig0mrcOQV4DzDkPImtivcHX1wGCaDm9zEBXi8DGZpbe-P1ZtgaSSBGztKU1i0Zfwo6An-25vY-n7J8oKzJNCw"
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)


def verify_refresh_token(token: str):
    try:
        payload = jwt.decode(token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None
