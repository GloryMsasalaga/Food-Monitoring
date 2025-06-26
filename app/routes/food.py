# app/routes/food.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast, String
from app import models, schema, database
from app.database import get_db
from app.utils import analyze_food_nutrition
from app.security import require_admin, get_current_user
from app.schema import UserInfo
from app.models import Student
import uuid

router = APIRouter()

# -------------------------
# Create Food (Admin only)
# -------------------------
@router.get("/food-intake", response_model=schema.FoodOut)
def create_food(
    food: schema.FoodCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Analyze the food nutrition using Nutritionix
    try:
        nutrition_data_raw = analyze_food_nutrition(food.food_name)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail="Nutrition analysis failed")
    
    nutrition_data = {
        "calories_estimate": nutrition_data_raw.get("calories_estimate"),
        "sugar_g": nutrition_data_raw.get("sugar_g"),
        "sodium_mg": nutrition_data_raw.get("sodium_mg"),
        "fat_g": nutrition_data_raw.get("fat_g"),
        "protein_g": nutrition_data_raw.get("protein_g"),
        "carbohydrates_g": nutrition_data_raw.get("carbohydrates_g"),
        "cholesterol_mg": nutrition_data_raw.get("cholesterol_mg"),
    }
    
    #exclude nutritional data keys to match the Food model
    # Only include fields that exist in your database table
    food_data = food.model_dump("calories_estimate", "sugar_g", "sodium_mg", "fat_g", "protein_g", "carbohydrates_g", "cholesterol_mg")
    new_food_data = {**food_data, **nutrition_data}
    
    new_food = models.Food(**new_food_data)
    db.add(new_food)
    db.commit()
    db.refresh(new_food)
    return new_food

# -------------------------
# Get All Food (Public)
# -------------------------
@router.post("/food-intake")
async def get_food_intake(
    nutritional_raw_data: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Get food intake based on nutritional raw data"""
    # You can process nutritional_raw_data as needed here
    # For demonstration, let's assume you want to return it in the same structure as before

    return {
        "items": [
            {
                "food_id": str(nutritional_raw_data.get("food_id", "")),
                "food_items": nutritional_raw_data.get("food_items", []),
                "meal_type": nutritional_raw_data.get("meal_type", ""),
                "intake_time": nutritional_raw_data.get("intake_time", "")
            }
        ]
    }

# -------------------------
# Get One Food (Public)
# -------------------------
@router.get("/{food_id}", response_model=schema.FoodOut)
def get_food(food_id: uuid.UUID, db: Session = Depends(get_db)):
    food = db.query(models.Food).filter(models.Food.food_id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    return food

# -------------------------
# Update Food (Admin only)
# -------------------------
@router.put("/{food_id}", response_model=schema.FoodOut)
def update_food(
    food_id: uuid.UUID,
    update_data: schema.FoodCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):
    food = db.query(models.Food).filter(models.Food.food_id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    for key, value in update_data.dict().items():
        setattr(food, key, value)

    db.commit()
    db.refresh(food)
    return food


# -------------------------
# Delete Food (Admin only)
# -------------------------
@router.delete("/{food_id}")
def delete_food(
    food_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    food = db.query(models.Food).filter(models.Food.food_id == food_id).first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    db.delete(food)
    db.commit()
    return {"detail": "Food deleted"}

#--------------------------
# Tracking Food (Public)
#--------------------------
@router.get("/current_user", response_model=UserInfo)
async def get_current_user_info(current_user: Student = Depends(get_current_user)):
    """Returns current user information based on JWT token"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Return user information including the UUID
    return {
        "first_name": (current_user.first_name),
        "last_name": (current_user.last_name),
        "user_id": str(current_user.user_id),  # Convert UUID to string
        "email": current_user.email,
    }    