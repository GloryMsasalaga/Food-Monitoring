-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (optional, safe if re-running)
DROP TABLE IF EXISTS food_suggestion;
DROP TABLE IF EXISTS allergy;
DROP TABLE IF EXISTS drink;
DROP TABLE IF EXISTS food;
DROP TABLE IF EXISTS health;
DROP TABLE IF EXISTS device;
DROP TABLE IF EXISTS student;

-- Create Student Table
CREATE TABLE student (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    user_password TEXT NOT NULL,
    gender VARCHAR(6) NOT NULL CHECK (gender IN ('Male', 'Female')),
    date_of_birth DATE NOT NULL CHECK (date_of_birth < CURRENT_DATE),
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	role VARCHAR(10) NOT NULL CHECK(role IN ('student', 'admin'))
);

-- Create Device Table
CREATE TABLE device (
    device_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('Wearable')),
    registration_date DATE NOT NULL CHECK (registration_date <= CURRENT_DATE)
);

-- Create Health Table
CREATE TABLE health (
    health_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES device(device_id) ON DELETE CASCADE,
    heart_rate_bpm INT NOT NULL CHECK (heart_rate_bpm > 0),
    systolic_bp INT NOT NULL CHECK (systolic_bp > 0),
    diastolic_bp INT NOT NULL CHECK (diastolic_bp > 0),
	height_m FLOAT NOT NULL CHECK (height_m IS NULL OR height_m > 0),
    weight_kg FLOAT NOT NULL CHECK (weight_kg IS NULL OR weight_kg > 0),
    measurement_time TIMESTAMP NOT NULL CHECK (measurement_time <= CURRENT_TIMESTAMP)
);

-- Create Food Table
CREATE TABLE food (
    food_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
    food_items TEXT NOT NULL,
    intake_time TIMESTAMP NOT NULL CHECK (intake_time <= CURRENT_TIMESTAMP),
    calories_estimate FLOAT CHECK (calories_estimate IS NULL OR calories_estimate >= 0)
);

-- Create Drink Table
CREATE TABLE drink (
    drink_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    drink_type VARCHAR(100) NOT NULL CHECK (drink_type IN ('Soda', 'Juice', 'Energy drink', 'Water', 'Alcohol')),
    sugar_g FLOAT CHECK (sugar_g IS NULL OR sugar_g >= 0),
    volume_ml INT NOT NULL CHECK (volume_ml > 0),
    drink_time TIMESTAMP NOT NULL CHECK (drink_time <= CURRENT_TIMESTAMP)
);

-- Create Allergy Table
CREATE TABLE allergy (
    allergy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    allergy_type VARCHAR(100) CHECK (allergy_type IN ('Hypertension', 'Diabetes', 'Asthma', 'Peanut Allergy', 'Lactose Intolerance')),
    description TEXT
);

-- Create Food Suggestions Table
CREATE TABLE food_suggestion (
    suggestion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    based_on_bp VARCHAR(50) NOT NULL CHECK (based_on_bp IN ('High BP', 'Low BP', 'Normal')),
	food_sg VARCHAR(100) NOT NULL CHECK (food_sg IN ('Reduce consumption of Fast Food')),
	drink_sg VARCHAR(100) NOT NULL CHECK (drink_sg IN ('reduce the Consumption of Sugar and Alcohol')),
    generated_on TIMESTAMP NOT NULL CHECK (generated_on <= CURRENT_TIMESTAMP)
);
