# app/routes/health.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schema
from app.database import get_db
from app.security import require_admin
import uuid

router = APIRouter()

# -------------------------
# Create Health (Admin only)
# -------------------------
@router.post("/", response_model=schema.HealthOut)
def create_health(
    health: schema.HealthCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    new_health = models.Health(**health.model_dump())
    db.add(new_health)
    db.commit()
    db.refresh(new_health)
    return new_health


# -------------------------
# Get All Health Records (Public)
# -------------------------
@router.get("/", response_model=list[schema.HealthOut])
def get_all_health(db: Session = Depends(get_db)):
    return db.query(models.Health).all()


# -------------------------
# Get One Health Record (Public)
# -------------------------
@router.get("/{health_id}", response_model=schema.HealthOut)
def get_health(health_id: uuid.UUID, db: Session = Depends(get_db)):
    health = db.query(models.Health).filter(models.Health.health_id == health_id).first()
    if not health:
        raise HTTPException(status_code=404, detail="Health not found")
    return health


# -------------------------
# Update Health Record (Admin only)
# -------------------------
@router.put("/{health_id}", response_model=schema.HealthOut)
def update_health(
    health_id: uuid.UUID,
    update_data: schema.HealthCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    health = db.query(models.Health).filter(models.Health.health_id == health_id).first()
    if not health:
        raise HTTPException(status_code=404, detail="Health not found")
    
    for key, value in update_data.dict().items():
        setattr(health, key, value)
    
    db.commit()
    db.refresh(health)
    return health


# -------------------------
# Delete Health Record (Admin only)
# -------------------------
@router.delete("/{health_id}")
def delete_health(
    health_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin)
):
    health = db.query(models.Health).filter(models.Health.health_id == health_id).first()
    if not health:
        raise HTTPException(status_code=404, detail="Health not found")
    
    db.delete(health)
    db.commit()
    return {"detail": "Health deleted"}


