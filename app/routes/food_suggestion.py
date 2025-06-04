from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schema, database
from app.database import get_db
from app.security import require_admin, get_current_user
from app.utils import calculate_nutrient_percentages
from app.utils import generate_nutrient_comments
from datetime import datetime, timedelta, timezone
import uuid

router = APIRouter(prefix="/suggestions", tags=["Suggestions"])

# -------------------------------
# Create a Food Suggestion (Admin only)
# -------------------------------
@router.post("/", response_model=schema.SuggestionOut)
def create_suggestion(
    food_suggestion: schema.SuggestionCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin)
):
    new_suggestion = models.Suggestion(**food_suggestion.model_dump())
    db.add(new_suggestion)
    db.commit()
    db.refresh(new_suggestion)
    return new_suggestion


# -------------------------------
# Get all Food Suggestions (Public)
# -------------------------------
@router.get("/", response_model=list[schema.SuggestionOut])
def get_all_suggestion(db: Session = Depends(get_db)):
    return db.query(models.Suggestion).all()


# -------------------------------
# Get one Food Suggestion (Public)
# -------------------------------
@router.get("/{suggestion_id}", response_model=schema.SuggestionOut)
def get_suggestion(suggestion_id: uuid.UUID, db: Session = Depends(get_db)):
    food_suggestion = db.query(models.Suggestion).filter(models.Suggestion.suggestion_id == suggestion_id).first()
    if not food_suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return food_suggestion


# -------------------------------
# Update Food Suggestion (Admin only)
# -------------------------------
@router.put("/{suggestion_id}", response_model=schema.SuggestionOut)
def update_suggestion(
    suggestion_id: uuid.UUID,
    update_data: schema.SuggestionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    food_suggestion = db.query(models.Suggestion).filter(models.Suggestion.suggestion_id == suggestion_id).first()
    if not food_suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    for key, value in update_data.dict().items():
        setattr(food_suggestion, key, value)

    db.commit()
    db.refresh(food_suggestion)
    return food_suggestion


# -------------------------------
# Delete Food Suggestion (Admin only)
# -------------------------------
@router.delete("/{suggestion_id}")
def delete_suggestion(
    suggestion_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    food_suggestion = db.query(models.Suggestion).filter(models.Suggestion.suggestion_id == suggestion_id).first()
    if not food_suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    db.delete(food_suggestion)
    db.commit()
    return {"detail": "Suggestion deleted"}


# -------------------------------
# AUTO-GENERATE Weekly Food Suggestion (Authenticated user)
# -------------------------------
@router.post("/generate/weekly", response_model=schema.SuggestionOut)
def generate_weekly_food_suggestion(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=7)

    # Get last 7 days of food records
    food_logs = db.query(models.Food).filter(
        models.Food.user_id == current_user.user_id,
        models.Food.intake_time >= start_date,
        models.Food.intake_time <= end_date
    ).all()

    if not food_logs:
        raise HTTPException(status_code=404, detail="No food intake data found in past 7 days.")

    totals = {
        "calories": sum(f.calories_estimate or 0 for f in food_logs),
        "sugar_g": sum(f.sugar_g or 0 for f in food_logs),
        "sodium_mg": sum(f.sodium_mg or 0 for f in food_logs),
        "fat_g": sum(f.fat_g or 0 for f in food_logs),
        "protein_g": sum(f.protein_g or 0 for f in food_logs),
        "carbohydrates_g": sum(f.carbohydrates_g or 0 for f in food_logs),
        "cholesterol_mg": sum(f.cholesterol_mg or 0 for f in food_logs),
    }

    percentages = calculate_nutrient_percentages(totals)
    food_comments = generate_nutrient_comments(percentages, suggestion_type="weekly")

    new_suggestion = models.Suggestion(
        user_id=current_user.user_id,
        food_sg=str(food_comments),
        drink_sg="",
        suggestion_type="weekly"
        # generated_on=datetime.now(timezone.utc)
    )

    db.add(new_suggestion)
    db.commit()
    db.refresh(new_suggestion)
    return new_suggestion
