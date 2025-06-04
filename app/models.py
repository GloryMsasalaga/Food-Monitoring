# app/models.py

from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, String, Integer, Float, Double, DateTime, ForeignKey, Text, TIMESTAMP, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

Base = declarative_base()
class GenderEnum(str, enum.Enum):
    male = "Male"
    female = "Female"
class Student(Base):
    __tablename__ = "student"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True)
    user_password = Column(Text, nullable=False)
    gender = Column(SQLEnum(GenderEnum, name="gender_enum"), nullable=False)
    date_of_birth = Column(DateTime, nullable=False)
    start_date = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)
    role = Column(String, default="student", nullable=False) # Could be User or an Admin


class Device(Base):
    __tablename__= "device"

    device_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    device_type = Column(String(50), nullable=False)
    registration_date = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


class Health(Base):
    __tablename__= "health"

    health_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    device_id = Column(UUID(as_uuid=True), ForeignKey(Device.device_id, ondelete="CASCADE"), nullable=False)
    heart_rate_bpm = Column(Integer, nullable=False)
    systolic_bp = Column(Integer, nullable=False)
    diastolic_bp = Column(Integer, nullable=False)
    height_m = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    measurement_time = Column(TIMESTAMP(timezone=True), nullable=False)


class Food(Base):
    __tablename__= "food"

    food_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    meal_type = Column(String(50), nullable=False)
    food_items = Column(Text, nullable=False)
    intake_time = Column(TIMESTAMP(timezone=True), nullable=False)
    calories_estimate = Column(Float)


class Drink(Base):
    __tablename__= "drink"

    drink_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    drink_type = Column(String(100), nullable=False)
    sugar_g = Column(Float)
    volume_ml = Column(Integer, nullable=False)
    drink_time = Column(TIMESTAMP(timezone=True), nullable=False)


class Allergy(Base):
    __tablename__= "allergy"

    allergy_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    allergy_type = Column(String(100))
    description = Column(Text)


class Suggestion(Base):
    __tablename__= "food_suggestion"

    suggestion_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = user_id = Column(UUID(as_uuid=True), ForeignKey(Student.user_id, ondelete="CASCADE"), nullable=False)
    based_on_bp = Column(String(50), nullable=False)
    food_sg = Column(String(100), nullable=False)
    drink_sg = Column(String(100), nullable=False)
    generated_on = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)


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
