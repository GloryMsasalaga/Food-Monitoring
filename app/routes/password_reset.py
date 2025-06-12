# app/routes/password_reset.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schema, database
from app.security import create_reset_token, verify_reset_token, hash_password
from app.database import get_db
from app.schema import PasswordResetConfirm
from app.models import Student


router = APIRouter(prefix="/password-reset", tags=["Password Reset"])


@router.post("/request")
def request_password_reset(payload: schema.PasswordResetRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.Student).filter(models.Student.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User with that email does not exist")

    token = create_reset_token({"sub": user.email})

    # Normally you would email the token. Here, we just return it for simplicity.
    return {"reset_token": token, "message": "Send this token to the user via email"}


@router.post("/confirm")
def reset_password(data: schema.PasswordResetConfirm, db: Session = Depends(get_db)):
    email = verify_reset_token(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    student = db.query(models.Student).filter(models.Student.email == email).first()
    if not student:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 🔐 Hash new password
    hashed_password = hash_password(data.new_password)
    student.user_password = hashed_password

    # 💾 Commit to the DB
    db.commit()
    db.refresh(student)

    return {"detail": "Password has been reset successfully"}


@router.post("/reset-confirm")
def confirm_reset(data: PasswordResetConfirm, db: Session = Depends(get_db)):
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    email = verify_reset_token(data.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    student = db.query(Student).filter(Student.email == email).first()
    if not student:
        raise HTTPException(status_code=404, detail="User not found")

    student.user_password = hash_password(data.new_password)
    db.commit()
    return {"detail": "Password reset successful"}

