-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (optional, safe if re-running)
DROP TABLE IF EXISTS food_suggestion;
DROP TABLE IF EXISTS allergy;
DROP TABLE IF EXISTS drink;
DROP TABLE IF EXISTS food;
DROP TABLE IF EXISTS health;
DROP TABLE IF EXISTS device;
DROP TABLE IF EXISTS student;

-- STUDENT TABLE
CREATE TABLE IF NOT EXISTS student (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    user_password TEXT NOT NULL,
    gender VARCHAR(6) NOT NULL CHECK (gender IN ('male', 'female')),
    date_of_birth TIMESTAMP NOT NULL CHECK (date_of_birth < CURRENT_DATE),
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    role VARCHAR NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin'))
);

-- HEALTH TABLE
CREATE TABLE IF NOT EXISTS health (
    health_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    height_m FLOAT NOT NULL,
    weight_kg FLOAT NOT NULL,
    measurement_time TIMESTAMPTZ NOT NULL CHECK (measurement_time <= CURRENT_TIMESTAMP)
);

-- FOOD TABLE
CREATE TABLE IF NOT EXISTS food (
    food_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    meal_type VARCHAR(10) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_items TEXT NOT NULL,
    intake_time TIMESTAMPTZ NOT NULL CHECK (intake_time <= CURRENT_TIMESTAMP),
    calories_estimate FLOAT CHECK (calories_estimate IS NULL OR calories_estimate >= 0),
    sugar_g FLOAT CHECK (sugar_g IS NULL OR sugar_g >= 0),
    sodium_mg FLOAT CHECK (sodium_mg IS NULL OR sodium_mg >= 0),
    fat_g FLOAT CHECK (fat_g IS NULL OR fat_g >= 0),
    protein_g FLOAT CHECK (protein_g IS NULL OR protein_g >= 0),
    carbohydrates_g FLOAT CHECK (carbohydrates_g IS NULL OR carbohydrates_g >= 0),
    cholesterol_mg FLOAT CHECK (cholesterol_mg IS NULL OR cholesterol_mg >= 0)
);

-- DRINK TABLE
CREATE TABLE IF NOT EXISTS drink (
    drink_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    drink_type VARCHAR(100) NOT NULL,
    drink_time TIMESTAMPTZ NOT NULL CHECK (drink_time <= CURRENT_TIMESTAMP),
    volume_ml INTEGER NOT NULL CHECK (volume_ml IS NULL OR volume_ml >= 0),
    sugar_g FLOAT CHECK (sugar_g IS NULL OR sugar_g >= 0),
    calories FLOAT CHECK (calories IS NULL OR calories >= 0),
    caffeine_mg FLOAT CHECK (caffeine_mg IS NULL OR caffeine_mg >= 0),
    alcohol_pct FLOAT CHECK (alcohol_pct IS NULL OR alcohol_pct >= 0),
    sodium_mg FLOAT CHECK (sodium_mg IS NULL OR sodium_mg >= 0),
    potassium_mg FLOAT CHECK (potassium_mg IS NULL OR potassium_mg >= 0)
);

-- ALLERGY TABLE
CREATE TABLE IF NOT EXISTS allergy (
    allergy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    allergy_type VARCHAR(100) NOT NULL CHECK (allergy_type IN ('peanut', 'tree nut', 'sesame', 'dairy', 'egg', 'wheat', 'gluten',
                                                        'fish', 'shellfish', 'soy', 'lupin', 'corn', 'mustard', 'celery',
                                                        'sulfite', 'alcohol', 'caffeine', 'food_dye', 'other')),
    description TEXT
);

-- FOOD SUGGESTION TABLE
CREATE TABLE IF NOT EXISTS food_suggestion (
    suggestion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    food_sg VARCHAR(5000) NOT NULL,
    generated_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    suggestion_type VARCHAR(10) NOT NULL CHECK (suggestion_type IN ('weekly', 'monthly'))
);

-- DRINK SUGGESTION TABLE
CREATE TABLE IF NOT EXISTS drink_suggestion (
    suggestion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES student(user_id) ON DELETE CASCADE,
    drink_sg VARCHAR(5000) NOT NULL,
    generated_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    suggestion_type VARCHAR(10) NOT NULL CHECK (suggestion_type IN ('weekly', 'monthly'))
);

