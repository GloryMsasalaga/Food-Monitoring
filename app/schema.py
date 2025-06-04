# app/schema.py

from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
import uuid
from uuid import UUID

# Schema for creating a new student
class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    user_password: str
    gender: str
    date_of_birth: date
    role: str = "student"


class StudentOut(BaseModel):
    user_id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    gender: str
    date_of_birth: datetime
    role: str = "student"

    class Config:
        from_attributes = True


class StudentSignup(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    user_password: str
    gender: str
    date_of_birth: datetime
    role: str = "student"


# Schema for creating new device data
class DeviceCreate(BaseModel):
    user_id: uuid.UUID
    device_type: str
    registration_date: datetime


# Schema for returning device data
class DeviceOut(BaseModel):
    device_id: UUID
    user_id: uuid.UUID
    device_type: str
    registration_date: datetime

    class Config:
        from_attributes = True


# Schema for Creating new Health
class HealthCreate(BaseModel):
    user_id: uuid.UUID
    device_id: uuid.UUID
    heart_rate_bpm: int
    systolic_bp: int
    diastolic_bp: int
    height_m: float = None
    weight_kg: float = None
    measurement_time: datetime


# Schema for returning Health data
class HealthOut(BaseModel):
    health_id: UUID
    user_id: uuid.UUID
    device_id: uuid.UUID
    heart_rate_bpm: int
    systolic_bp: int
    diastolic_bp: int
    height_m: float
    weight_kg: float
    measurement_time: datetime

    class Config:
        from_attributes = True


# Schema for creating new Food
class FoodCreate(BaseModel):
    user_id: uuid.UUID
    meal_type: str
    food_items: str
    intake_time: datetime
    calories_estimate: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    fat_g: Optional[float] = None
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    cholesterol_mg: Optional[float] = None


# Schema for returning Food data
class FoodOut(BaseModel):
    food_id: UUID
    user_id: uuid.UUID
    meal_type: str
    food_items: str
    intake_time: datetime
    calories_estimate: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    fat_g: Optional[float] = None
    protein_g: Optional[float] = None
    carbohydrates_g: Optional[float] = None
    cholesterol_mg: Optional[float] = None

    class Config:
        from_attributes = True


# Schema for creating new Drink
class DrinkCreate(BaseModel):
    user_id: uuid.UUID
    drink_type: str
    sugar_g: Optional[float] = None
    volume_ml: int
    drink_time: datetime
    calories: Optional[float] = None
    caffeine_mg: Optional[float] = None
    alcohol_pct: Optional[float] = None
    sodium_mg: Optional[float] = None
    potassium_mg: Optional[float] = None


# Schema for returning drink data
class DrinkOut(BaseModel):
    drink_id: UUID
    user_id: uuid.UUID
    drink_type: str
    sugar_g: Optional[float] = None
    volume_ml: int
    drink_time: datetime
    calories: Optional[float] = None
    caffeine_mg: Optional[float] = None
    alcohol_pct: Optional[float] = None
    sodium_mg: Optional[float] = None
    potassium_mg: Optional[float] = None


    class Config:
        from_attributes = True


# Schema for creating new Allergy
class AllergyCreate(BaseModel):
    user_id: uuid.UUID
    allergy_type: str
    description: str


# Schema for returning Allergy data
class AllergyOut(BaseModel):
    allergy_id: UUID
    user_id: uuid.UUID
    allergy_type: str
    description: str

    class Config:
        from_attributes = True


# Schema for creating new suggestion
class SuggestionCreate(BaseModel):
    user_id: uuid.UUID
    food_sg: str
    drink_sg: str
    generated_on: datetime
    suggestion_type: str


# Schema for returning Food suggestion data
class SuggestionOut(BaseModel):
    suggestion_id: UUID
    user_id: uuid.UUID
    food_sg: str
    drink_sg: str
    generated_on: datetime
    suggestion_type: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class TokenRefreshRequest(BaseModel):
    refresh_token: str

