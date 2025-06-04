# app/schema.py

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import date, datetime
import uuid
from uuid import UUID
from .models import GenderEnum

# Schema for creating a new student
class StudentCreate(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    user_password: str = Field(..., min_length=8)
    gender: str
    date_of_birth: date
    role: str = "student"


# Schema for returning student data
class StudentOut(BaseModel):
    user_id: UUID
    first_name: str
    last_name: str
    email: EmailStr
    gender: str
    date_of_birth: date
    start_date: datetime
    role: str

    class Config:
        from_attributes = True


class StudentSignup(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    user_password: str = Field(..., min_length=8)
    gender: GenderEnum
    date_of_birth: datetime
    role: str = "Student"
        
class StudentOut(BaseModel):
    user_id: uuid.UUID
    first_name: str
    last_name: str
    email: EmailStr
    gender: str
    date_of_birth: datetime
    role: str = "Student"

    class Config:
        from_attributes = True



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

    class config:
        from_attributes = True


# Schema for creating new Food
class FoodCreate(BaseModel):
    user_id: uuid.UUID
    meal_type: str
    food_items: str
    intake_time: datetime
    calories_estimate: float


# Schema for returning Food data
class FoodOut(BaseModel):
    food_id: UUID
    user_id: uuid.UUID
    meal_type: str
    food_items: str
    intake_time: datetime
    calories_estimate: float

    class config:
        from_attributes = True
        
#class for creating new preferences
class PreferenceCreate(BaseModel):
    user_id: uuid.UUID
    dietary_restrictions: str  # vegetarian, vegan, etc.
    preferred_meal_time: str  # serialized list or JSON
    meals_per_day: int
    preferred_drink_type: str
    disease: str  # diabetes, hypertension, etc.
    preferred_meal_type: str
    preffered_allergy: str
class PreferenceOut(BaseModel):
    preference_id: UUID
    user_id: uuid.UUID
    dietary_restrictions: str
    preferred_meal_time: str
    meals_per_day: int
    preferred_drink_type: str
    disease: str
    preferred_meal_type: str
    preffered_allergy: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Schema for creating new Drink
class DrinkCreate(BaseModel):
    user_id: uuid.UUID
    drink_type: str
    amount: float
    unit: str
    intake_time: datetime
    amount_ml: int
    timestamp: datetime = Field(default_factory=datetime.now)


# Schema for returning drink data
class DrinkOut(BaseModel):
    drink_id: UUID
    user_id: uuid.UUID
    drink_type: str
    amount: float
    amount_ml: int
    intake_time: datetime

    class config:
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

    class config:
        from_attributes = True


# Schema for creating new suggestion
class SuggestionCreate(BaseModel):
    user_id: uuid.UUID
    based_on_bp: str
    food_sg: str
    drink_sg: str
    generated_on: datetime


# Schema for returning Food suggestion data
class SuggestionOut(BaseModel):
    suggestion_id: UUID
    user_id: uuid.UUID
    based_on_bp: str
    food_sg: str
    drink_sg: str
    generated_on: datetime

    class config:
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