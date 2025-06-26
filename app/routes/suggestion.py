from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schema, database
from app.database import get_db
from app.security import require_admin, get_current_user
from app.utils import (calculate_food_nutrient_percentages, generate_food_nutrient_comments,
                       calculate_drink_nutrient_percentages, generate_drink_nutrient_comments)
from datetime import datetime, timedelta, timezone
import uuid

router = APIRouter()

# -------------------------------
# Create a Food Suggestion (Admin only)
# -------------------------------
@router.post("/", response_model=schema.FoodSuggestionOut)
def create_suggestion(
    food_suggestion: schema.FoodSuggestionCreate,
    db: Session = Depends(database.get_db),
    current_user=Depends(require_admin)
):
    new_suggestion = models.FoodSuggestion(**food_suggestion.model_dump())
    db.add(new_suggestion)
    db.commit()
    db.refresh(new_suggestion)
    return new_suggestion


# -------------------------------
# Get all Food Suggestions (Public)
# -------------------------------
@router.get("/", response_model=list[schema.FoodSuggestionOut])
def get_all_suggestion(db: Session = Depends(get_db)):
    return db.query(models.FoodSuggestion).all()


# -------------------------------
# Get one Food Suggestion (Public)
# -------------------------------
@router.get("/{suggestion_id}", response_model=schema.FoodSuggestionOut)
def get_suggestion(suggestion_id: uuid.UUID, db: Session = Depends(get_db)):
    food_suggestion = db.query(models.FoodSuggestion).filter(models.FoodSuggestion.suggestion_id == suggestion_id).first()
    if not food_suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return food_suggestion


# -------------------------------
# Update Food Suggestion (Admin only)
# -------------------------------
@router.put("/{suggestion_id}", response_model=schema.FoodSuggestionOut)
def update_suggestion(
    suggestion_id: uuid.UUID,
    update_data: schema.FoodSuggestionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    food_suggestion = db.query(models.FoodSuggestion).filter(models.FoodSuggestion.suggestion_id == suggestion_id).first()
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
    food_suggestion = db.query(models.FoodSuggestion).filter(models.FoodSuggestion.suggestion_id == suggestion_id).first()
    if not food_suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    db.delete(food_suggestion)
    db.commit()
    return {"detail": "Suggestion deleted"}


# -------------------------------
# AUTO-GENERATE Weekly Food Suggestion (Authenticated user)
# -------------------------------
@router.post("/generate/weekly-food", response_model=schema.FoodSuggestionOut)
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

    percentages = calculate_food_nutrient_percentages(totals)
    food_comments = generate_food_nutrient_comments(percentages, suggestion_type="weekly")

    new_suggestion = models.FoodSuggestion(
        user_id=current_user.user_id,
        food_sg=str(food_comments),
        suggestion_type="weekly"
    )

    db.add(new_suggestion)
    db.commit()
    db.refresh(new_suggestion)
    return new_suggestion

# -------------------------------
# AUTO-GENERATE Monthly Food Suggestion (Authenticated user)
# -------------------------------
@router.post("/generate/monthly-food", response_model=schema.FoodSuggestionOut)
def generate_monthly_food_suggestion(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)

    food_logs = db.query(models.Food).filter(
        models.Food.user_id == current_user.user_id,
        models.Food.intake_time >= start_date,
        models.Food.intake_time <= end_date
    ).all()

    if not food_logs:
        raise HTTPException(status_code=404, detail="No food intake data found in past 30 days.")

    totals = {
        "calories": sum(f.calories_estimate or 0 for f in food_logs),
        "sugar_g": sum(f.sugar_g or 0 for f in food_logs),
        "sodium_mg": sum(f.sodium_mg or 0 for f in food_logs),
        "fat_g": sum(f.fat_g or 0 for f in food_logs),
        "protein_g": sum(f.protein_g or 0 for f in food_logs),
        "carbohydrates_g": sum(f.carbohydrates_g or 0 for f in food_logs),
        "cholesterol_mg": sum(f.cholesterol_mg or 0 for f in food_logs),
    }

    percentages = calculate_food_nutrient_percentages(totals)
    food_comments = generate_food_nutrient_comments(percentages, suggestion_type="monthly")

    new_suggestion = models.FoodSuggestion(
        user_id=current_user.user_id,
        food_sg=str(food_comments),
        suggestion_type="monthly"
    )

    db.add(new_suggestion)
    db.commit()
    db.refresh(new_suggestion)
    return new_suggestion

# -------------------------------
# AUTO-GENERATE Weekly Drink Suggestion (Authenticated user)
# -------------------------------
@router.post("/generate/weekly-drink", response_model=schema.DrinkSuggestionOut)
def generate_weekly_drink_suggestion(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=7)

    drink_logs = db.query(models.Drink).filter(
        models.Drink.user_id == current_user.user_id,
        models.Drink.drink_time >= start_date,
        models.Drink.drink_time <= end_date
    ).all()

    if not drink_logs:
        raise HTTPException(status_code=404, detail="No drink intake data found in past 7 days.")

    totals = {
        "calories": sum(d.calories or 0 for d in drink_logs),
        "sugar_g": sum(d.sugar_g or 0 for d in drink_logs),
        "caffeine_mg": sum(d.caffeine_mg or 0 for d in drink_logs),
        "sodium_mg": sum(d.sodium_mg or 0 for d in drink_logs),
        "potassium_mg": sum(d.potassium_mg or 0 for d in drink_logs),
    }

    percentages = calculate_drink_nutrient_percentages(totals)
    drink_comments = generate_drink_nutrient_comments(percentages, suggestion_type="weekly")

    new_suggestion = models.DrinkSuggestion(
        user_id=current_user.user_id,
        drink_sg=str(drink_comments),
        suggestion_type="weekly"
    )

    db.add(new_suggestion)
    db.commit()
    db.refresh(new_suggestion)
    return new_suggestion

# -------------------------------
# AUTO-GENERATE Monthly Drink Suggestion (Authenticated user)
# -------------------------------
@router.post("/generate/monthly-drink", response_model=schema.DrinkSuggestionOut)
def generate_monthly_drink_suggestion(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)

    drink_logs = db.query(models.Drink).filter(
        models.Drink.user_id == current_user.user_id,
        models.Drink.drink_time >= start_date,
        models.Drink.drink_time <= end_date
    ).all()

    if not drink_logs:
        raise HTTPException(status_code=404, detail="No drink intake data found in past 30 days.")

    totals = {
        "calories": sum(d.calories or 0 for d in drink_logs),
        "sugar_g": sum(d.sugar_g or 0 for d in drink_logs),
        "caffeine_mg": sum(d.caffeine_mg or 0 for d in drink_logs),
        "sodium_mg": sum(d.sodium_mg or 0 for d in drink_logs),
        "potassium_mg": sum(d.potassium_mg or 0 for d in drink_logs),
    }

    percentages = calculate_drink_nutrient_percentages(totals)
    drink_comments = generate_drink_nutrient_comments(percentages, suggestion_type="monthly")

    new_suggestion = models.DrinkSuggestion(
        user_id=current_user.user_id,
        drink_sg=str(drink_comments),
        suggestion_type="monthly"
    )

    db.add(new_suggestion)
    db.commit()
    db.refresh(new_suggestion)
    return new_suggestion
