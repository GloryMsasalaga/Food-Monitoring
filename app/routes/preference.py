from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app import models, schema, database
from app.database import get_db
from app.security import get_current_user
import uuid

router = APIRouter()

@router.post("/save", response_model=schema.PreferenceOut)
def save_preference(
    preferences: schema.PreferenceCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user already has preferences
    existing_prefs = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == current_user.user_id
    ).first()
    
    if existing_prefs:
        # Update existing preferences
        for key, value in preferences.model_dump().items():
            setattr(existing_prefs, key, value)
        db.commit()
        db.refresh(existing_prefs)
        return existing_prefs
    else:
        # Create new preferences
        new_prefs = models.UserPreference(
            user_id=current_user.user_id,
            **preferences.model_dump()
        )
        db.add(new_prefs)
        db.commit()
        db.refresh(new_prefs)
        return new_prefs
    
@router.get("", response_model=schema.PreferenceOut)
def get_preference(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get the current user's preferences"""
    preference = db.query(models.UserPreference).filter(
        models.UserPreference.user_id == current_user.user_id
    ).first()
    
    if not preference:
        raise HTTPException(status_code=404, detail="No preferences found for this user")
    
    return preference