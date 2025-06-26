from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schema
from app.database import get_db
from app.security import require_admin
from app.utils import analyze_drink_nutrition
from app.security import get_current_user
from app.schema import UserInfo
from app.models import Student
from app.utils import analyze_drink_nutrition, map_drink_type
import uuid

router = APIRouter()

@router.post("/drink-intake", response_model=schema.DrinkOut)
def create_drink(
    drink: schema.DrinkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        nutrition_data_raw = analyze_drink_nutrition(drink.drink_type)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=400, detail="Could not record your drink")

    # Map nutritionix data keys to match your Drink model fields
    # Only include fields that exist in your database table
    nutrition_data = {
        "sugar_g": nutrition_data_raw.get("sugar_g"),
        "sodium_mg": nutrition_data_raw.get("sodium_mg"),
        # Only include these if your model supports these columns:
        # "calories": nutrition_data_raw.get("calories_estimate"),
        # "caffeine_mg": nutrition_data_raw.get("caffeine_mg"),
        # "alcohol_pct": nutrition_data_raw.get("alcohol_pct"),
        # "potassium_mg": nutrition_data_raw.get("potassium_mg"),
    }

    # Exclude nutritional fields to avoid conflicts, then merge
    drink_data = drink.model_dump(exclude={"sugar_g", "sodium_mg"})

    new_drink_data = {**drink_data, **nutrition_data}

    new_drink = models.Drink(**new_drink_data)
    db.add(new_drink)
    db.commit()
    db.refresh(new_drink)
    return new_drink


@router.get("/", response_model=list[schema.DrinkOut])
def get_all_drink(db: Session = Depends(get_db)):
    return db.query(models.Drink).all()

@router.put("/{drink_id}", response_model=schema.DrinkOut)
def update_drink(
    drink_id: uuid.UUID,
    update_data: schema.DrinkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    drink = db.query(models.Drink).filter(models.Drink.drink_id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    for key, value in update_data.model_dump().items():
        setattr(drink, key, value)

    db.commit()
    db.refresh(drink)
    return drink


@router.delete("/{drink_id}")
def delete_drink(
    drink_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    drink = db.query(models.Drink).filter(models.Drink.drink_id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")

    db.delete(drink)
    db.commit()
    return {"detail": "Drink deleted"}

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

# Then define your parameterized routes
@router.get("/{drink_id}", response_model=schema.DrinkOut)
def get_drink(drink_id: uuid.UUID, db: Session = Depends(get_db)):
    drink = db.query(models.Drink).filter(models.Drink.drink_id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")
    return drink

@router.post("/{drink_id}")
def track_drink_with_id(
    drink_id: uuid.UUID,
    drink_data: schema.DrinkCreate,
    db: Session = Depends(get_db),
    current_user: Student = Depends(get_current_user)
):
    """Track drink consumption with a specific drink ID"""
    try:
        try:
            nutrition_data_raw = analyze_drink_nutrition(drink_data.drink_type)
            
            # FOR CALCULATIONS: Get all nutrition data
            calculation_data = {
                "sugar_g": nutrition_data_raw.get("sugar_g", 0),
                "sodium_mg": nutrition_data_raw.get("sodium_mg", 0),
                "calories": nutrition_data_raw.get("calories_estimate", 0),
                "caffeine_mg": nutrition_data_raw.get("caffeine_mg", 0),
                "potassium_mg": nutrition_data_raw.get("potassium_mg", 0)
            }
            
            # FOR DATABASE: Only include fields that exist in the DB
            db_nutrition_data = {
                "sugar_g": calculation_data["sugar_g"],
                "sodium_mg": calculation_data["sodium_mg"]
            }
            
            # You can use calculation_data for any other calculations
            # For example, you could log it or use it for food suggestions
            print(f"Additional nutrition data for suggestions: {calculation_data}")
            
        except Exception as e:
            db_nutrition_data = {"sugar_g": 0, "sodium_mg": 0}
            print(f"Nutrition calculation error: {str(e)}")
        
        # Create new drink tracking record with only DB-supported fields
        new_tracking = models.Drink(
            user_id=current_user.user_id,
            drink_id=drink_id,
            drink_type=drink_data.drink_type,
            volume_ml=drink_data.volume_ml,
            drink_time=drink_data.drink_time,
            **db_nutrition_data  # Only include supported DB fields
        )
        
        # Add to database
        db.add(new_tracking)
        db.commit()
        db.refresh(new_tracking)
        
        return {"status": "success", "message": "Drink tracked successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error tracking drink: {str(e)}")