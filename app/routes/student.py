# app/routes/student.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app import models, schema
from app.database import get_db
from app.security import hash_password, require_admin
import uuid

router = APIRouter(prefix="/student", tags=["Student"])

# -----------------------------
# Admin-only: Create a student
# -----------------------------
@router.post("/", response_model=schema.StudentOut)
def create_student(
    student: schema.StudentCreate,
    db: Session = Depends(get_db),
    _: models.Student = Depends(require_admin)
):
    existing_student = db.query(models.Student).filter(models.Student.email == student.email).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="Email already registered.")

    hashed_password = hash_password(student.user_password)
    student.user_password = hashed_password

    new_student = models.Student(**student.model_dump())
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

# -----------------------------
# Admin-only: Get all students
# -----------------------------
@router.get("/", response_model=list[schema.StudentOut])
def get_all_students(
    db: Session = Depends(get_db),
    _: models.Student = Depends(require_admin)
):
    return db.query(models.Student).all()

# -----------------------------
# Admin-only: Get one student
# -----------------------------
@router.get("/{student_id}", response_model=schema.StudentOut)
def get_student(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: models.Student = Depends(require_admin)
):
    student = db.query(models.Student).filter(models.Student.user_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

# -----------------------------
# Admin-only: Update a student
# -----------------------------
@router.put("/{student_id}", status_code=status.HTTP_201_CREATED, response_model=schema.StudentOut)
def update_student(
    student_id: uuid.UUID,
    update_data: schema.StudentCreate,
    db: Session = Depends(get_db),
    _: models.Student = Depends(require_admin)
):
    student = db.query(models.Student).filter(models.Student.user_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for key, value in update_data.dict().items():
        setattr(student, key, value)
    
    hashed_password = hash_password(student.user_password)
    student.user_password = hashed_password

    db.commit()
    db.refresh(student)
    return student

# -----------------------------
# Admin-only: Delete a student
# -----------------------------
@router.delete("/{student_id}")
def delete_student(
    student_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: models.Student = Depends(require_admin)
):
    student = db.query(models.Student).filter(models.Student.user_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    db.delete(student)
    db.commit()
    return {"detail": "Student deleted"}


