from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schema, database
from app.database import get_db
from app.security import require_admin
from app.security import get_current_user
import uuid

router = APIRouter(prefix="/drink", tags=["Drink"])

# -------------------------
# Create a Drink (Admin only)
# -------------------------
@router.post("/", response_model=schema.DrinkOut)
def create_drink(
    drink: schema.DrinkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    new_drink = models.Drink(**drink.model_dump())
    db.add(new_drink)
    db.commit()
    db.refresh(new_drink)
    return new_drink


# -------------------------
# Get all Drink (Public)
# -------------------------
@router.get("/", response_model=list[schema.DrinkOut])
def get_all_drink(db: Session = Depends(get_db)):
    return db.query(models.Drink).all()


# -------------------------
# Get one Drink (Public)
# -------------------------
@router.get("/{drink_id}", response_model=schema.DrinkOut)
def get_drink(drink_id: uuid.UUID, db: Session = Depends(get_db)):
    drink = db.query(models.Drink).filter(models.Drink.drink_id == drink_id).first()
    if not drink:
        raise HTTPException(status_code=404, detail="Drink not found")
    return drink


# -------------------------
# Update Drink (Admin only)
# -------------------------
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

    for key, value in update_data.dict().items():
        setattr(drink, key, value)

    db.commit()
    db.refresh(drink)
    return drink


# -------------------------
# Delete Drink (Admin only)
# -------------------------
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

# -------------------------
# Track Drink Intake (Authenticated user)
# -------------------------
@router.post("/track", response_model=schema.DrinkOut)
def track_drink(
    drink: schema.DrinkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    new_drink = models.Drink(
        user_id=current_user.user_id,
        drink_type=drink.drink_type,
        unit=drink.unit,
        amount_ml=drink.amount_ml,
        intake_time=drink.intake_time,
        timestamp=drink.timestamp
    )
    db.add(new_drink)
    db.commit()
    db.refresh(new_drink)
    return new_drink

