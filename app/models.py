# app/models.py

from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, TIMESTAMP, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from sqlalchemy.sql import func
from app.database import Base
import enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()
class GenderEnum(str, enum.Enum):
    male = "Male"
    female = "Female"
class Student(Base):
    __tablename__ = "student"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    user_password = Column(Text, nullable=False)
    gender = Column(SQLEnum(GenderEnum, name="gender_enum"), nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    start_date = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    role = Column(String, default="student", nullable=False)  # student or admin


class Health(Base):
    __tablename__ = "health"

    health_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    height_m = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    measurement_time = Column(TIMESTAMP(timezone=True), nullable=False)


class Food(Base):
    __tablename__ = "food"

    food_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    meal_type = Column(String(10), nullable=False)
    food_items = Column(Text, nullable=False)
    intake_time = Column(DateTime(timezone=True), nullable=False)
    calories_estimate = Column(Float, nullable=True) 
    sugar_g = Column(Float, nullable=True)
    sodium_mg = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    carbohydrates_g = Column(Float, nullable=True)
    cholesterol_mg = Column(Float, nullable=True)


class Drink(Base):
    __tablename__ = "drink"

    drink_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    drink_type = Column(String(100), nullable=False)
    drink_time = Column(DateTime(timezone=True), nullable=False)
    volume_ml = Column(Integer, nullable=False)
    sugar_g = Column(Float, nullable=True)
    calories = Column(Float, nullable=True)
    caffeine_mg = Column(Float, nullable=True)
    sodium_mg = Column(Float, nullable=True)
    potassium_mg = Column(Float, nullable=True)


class Allergy(Base):
    __tablename__ = "allergy"

    allergy_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    allergy_type = Column(String(100), nullable=False)
    description = Column(Text)


class FoodSuggestion(Base):
    __tablename__ = "food_suggestion"

    suggestion_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    food_sg = Column(String(5000), nullable=False)
    generated_on = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    suggestion_type = Column(String(10), nullable=False)  # weekly, monthly


class DrinkSuggestion(Base):
    __tablename__ = "drink_suggestion"

    suggestion_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    drink_sg = Column(String(5000), nullable=False)
    generated_on = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    suggestion_type = Column(String(10), nullable=False)  # weekly, monthly


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserPreference(Base):
    __tablename__ = "user_preference"

    preference_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("student.user_id"))
    preferred_meal_type = Column(String)
    preffered_allergy = Column(String)
    dietary_restrictions = Column(String)
    preferred_meal_time = Column(String)
    preferred_drink_type = Column(String)
    meals_per_day = Column(Integer)
    disease = Column(String)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationship to user
    user = relationship("Student")
