from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schema
from app.database import get_db
from app.security import require_admin, require_user
import uuid

router = APIRouter()


# -------------------------
# Create an Allergy (Admin only)
# -------------------------
@router.post("/", response_model=schema.AllergyOut)
def create_allergy(
    allergy: schema.AllergyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    new_allergy = models.Allergy(**allergy.model_dump())
    db.add(new_allergy)
    db.commit()
    db.refresh(new_allergy)
    return new_allergy


# -------------------------
# Get all Allergies (Public)
# -------------------------
@router.get("/", response_model=list[schema.AllergyOut])
def get_all_allergy(db: Session = Depends(get_db)):
    return db.query(models.Allergy).all()


# -------------------------
# Get one Allergy (Public)
# -------------------------
@router.get("/{allergy_id}", response_model=schema.AllergyOut)
def get_allergy(allergy_id: uuid.UUID, db: Session = Depends(get_db)):
    allergy = db.query(models.Allergy).filter(models.Allergy.allergy_id == allergy_id).first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")
    return allergy


# -------------------------
# Update Allergy (Admin only)
# -------------------------
@router.put("/{allergy_id}", response_model=schema.AllergyOut)
def update_allergy(
    allergy_id: uuid.UUID,
    update_data: schema.AllergyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    allergy = db.query(models.Allergy).filter(models.Allergy.allergy_id == allergy_id).first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")

    for key, value in update_data.dict().items():
        setattr(allergy, key, value)

    db.commit()
    db.refresh(allergy)
    return allergy


# -------------------------
# Delete Allergy (Admin only)
# -------------------------
@router.delete("/{allergy_id}")
def delete_allergy(
    allergy_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    allergy = db.query(models.Allergy).filter(models.Allergy.allergy_id == allergy_id).first()
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")

    db.delete(allergy)
    db.commit()
    return {"detail": "Allergy deleted"}


