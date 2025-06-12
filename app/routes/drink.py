from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schema
from app.database import get_db
from app.security import require_admin
from app.utils import analyze_drink_nutrition
from app.security import get_current_user
import uuid

router = APIRouter(prefix="/drink", tags=["Drink"])

@router.post("/", response_model=schema.DrinkOut)
def create_drink(
    drink: schema.DrinkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    try:
        nutrition_data_raw = analyze_drink_nutrition(drink.drink_type)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Map nutritionix data keys to match your Drink model fields
    nutrition_data = {
        "calories": nutrition_data_raw.get("calories_estimate"),
        "sugar_g": nutrition_data_raw.get("sugar_g"),
        "sodium_mg": nutrition_data_raw.get("sodium_mg"),
        # Only include these if your model supports these columns:
        # "caffeine_mg": nutrition_data_raw.get("caffeine_mg"),
        # "alcohol_pct": nutrition_data_raw.get("alcohol_pct"),
        # "potassium_mg": nutrition_data_raw.get("potassium_mg"),
    }

    # Exclude nutritional fields to avoid conflicts, then merge
    drink_data = drink.model_dump(exclude={"calories", "sugar_g", "sodium_mg"})

    new_drink_data = {**drink_data, **nutrition_data}

    new_drink = models.Drink(**new_drink_data)
    db.add(new_drink)
    db.commit()
    db.refresh(new_drink)
    return new_drink


@router.get("/", response_model=list[schema.DrinkOut])
def get_all_drink(db: Session = Depends(get_db)):
    return db.query(models.Drink).all()


@router.get("/{drink_id}", response_model=schema.DrinkOut)
def get_drink(drink_id: uuid.UUID, db: Session = Depends(get_db)):
    drink = db.query(models.Drink).filter(models.Drink.drink_id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")
    return drink


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


