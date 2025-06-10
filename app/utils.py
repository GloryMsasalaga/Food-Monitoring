from app.food_comments import FOOD_COMMENTS
from app.drink_comments import DRINK_COMMENTS
from fastapi.templating import Jinja2Templates
from pathlib import Path
import os
import requests
from dotenv import load_dotenv
from typing import Dict, Optional, Union

# ---------------------------
# Template Setup for Web UI
# ---------------------------
templates_dir = Path(__file__).resolve().parent / "templates"
if not templates_dir.exists():
    raise FileNotFoundError(f"Templates directory {templates_dir} does not exist.")
templates = Jinja2Templates(directory=templates_dir)

# -------------------------
# Nutritionix API Setup
# -------------------------
load_dotenv()
NUTRITIONIX_APP_ID = os.getenv("NUTRITIONIX_APP_ID")
NUTRITIONIX_API_KEY = os.getenv("NUTRITIONIX_API_KEY")

if not NUTRITIONIX_APP_ID or not NUTRITIONIX_API_KEY:
    raise EnvironmentError("Nutritionix API credentials are not set in environment variables.")

def analyze_food_nutrition(query: str) -> Dict[str, Optional[Union[float, int]]]:
    """
    Analyze nutrition data for a given food description using Nutritionix API.
    Returns dictionary with nutrient breakdown.
    """
    url = "https://trackapi.nutritionix.com/v2/natural/nutrients"
    headers = {
        "x-app-id": NUTRITIONIX_APP_ID,
        "x-app-key": NUTRITIONIX_API_KEY,
        "Content-Type": "application/json"
    }
    data = {"query": query}

    response = requests.post(url, json=data, headers=headers, timeout=10)
    if response.status_code != 200:
        raise Exception(f"Nutritionix API Error: {response.status_code} - {response.text}")

    result = response.json()
    if not result.get("foods"):
        raise Exception("No food data returned from Nutritionix.")

    food = result["foods"][0]

    return {
        "calories_estimate": food.get("nf_calories"),
        "sugar_g": food.get("nf_sugars"),
        "sodium_mg": food.get("nf_sodium"),
        "fat_g": food.get("nf_total_fat"),
        "protein_g": food.get("nf_protein"),
        "cholesterol_mg": food.get("nf_cholesterol"),
        "carbohydrates_g": food.get("nf_total_carbohydrate"),
    }

def analyze_drink_nutrition(query: str) -> Dict[str, float | None]:
    """
    Analyze nutrition data for a given drink description using Nutritionix API.
    Returns a dict of key drink nutrient values.
    """
    url = "https://trackapi.nutritionix.com/v2/natural/nutrients"
    headers = {
        "x-app-id": NUTRITIONIX_APP_ID,
        "x-app-key": NUTRITIONIX_API_KEY,
        "Content-Type": "application/json"
    }
    data = {"query": query}

    try:
        response = requests.post(url, json=data, headers=headers, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        raise Exception(f"Nutritionix API request failed: {e}")

    result = response.json()
    foods = result.get("foods")  # Nutritionix returns both foods and drinks here

    if not foods:
        raise Exception("No drink data returned from Nutritionix.")

    drink = foods[0]

    return {
        "sugar_g": drink.get("nf_sugars"),
        "calories": drink.get("nf_calories"),
        "caffeine_mg": drink.get("nf_caffeine"),
        "sodium_mg": drink.get("nf_sodium"),
        "potassium_mg": drink.get("nf_potassium"),
    }

# -------------------------
# Food Recommended Daily Allowances (RDA) for 7 Days
# -------------------------
FOOD_RDA_WEEKLY = {
    "calories_estimate": 2000 * 7,
    "sugar_g": 50 * 7,
    "sodium_mg": 2300 * 7,
    "fat_g": 70 * 7,
    "protein_g": 50 * 7,
    "carbohydrates_g": 275 * 7,
    "cholesterol_mg": 300 * 7
}

# -------------------------
# Food Recommended Daily Allowances (RDA) for 30 Days
# -------------------------
MONTHLY_FOOD_RDA_VALUES = {k: v * 4 for k, v in FOOD_RDA_WEEKLY.items()}

# -------------------------
# Drink Recommended Daily Allowances (RDA) for 7 Days
# -------------------------
DRINK_RDA_WEEKLY = {
    "sugar_g": 36 * 7,
    "calories": 2000 * 7,
    "caffeine_mg": 400 * 7,
    "sodium_mg": 1500 * 7,
    "potassium_mg": 4700 * 7,
}

# -------------------------
# Drink Recommended Daily Allowances (RDA) for 30 Days
# -------------------------
MONTHLY_DRINK_RDA_VALUES = {k: v * 4 for k, v in DRINK_RDA_WEEKLY.items()}

def calculate_food_nutrient_percentages(totals: Dict[str, Optional[Union[float, int]]]) -> Dict[str, float]:
    """
    Calculate the percentage of RDA consumed for each food nutrient.
    """
    percentages = {}
    for nutrient, value in totals.items():
        rda = FOOD_RDA_WEEKLY.get(nutrient, 1)
        if value is None or rda == 0:
            percentages[nutrient] = 0.0
        else:
            percentages[nutrient] = round((value / rda) * 100, 2)
    return percentages

def calculate_drink_nutrient_percentages(totals: dict) -> dict:
    """
    Calculate the percentage of RDA consumed for each drink nutrient.
    """
    percentages = {}
    for nutrient, value in totals.items():
        rda = DRINK_RDA_WEEKLY.get(nutrient, 1)
        percentages[nutrient] = round((value / rda) * 100, 2)
    return percentages

def calculate_food_field_distribution_percentages(totals: Dict[str, Optional[Union[float, int]]]) -> Dict[str, float]:
    """
    Calculate the percentage contribution of each nutrient to the total sum of all food nutrients.
    """
    total_sum = sum(v for v in totals.values() if isinstance(v, (int, float)) and v is not None)
    if total_sum == 0:
        return {k: 0.0 for k in totals}
    return {
        k: round((v / total_sum) * 100, 2) if isinstance(v, (int, float)) and v is not None else 0.0
        for k, v in totals.items()
    }

def calculate_drink_field_distribution_percentages(totals: dict) -> dict:
    """
    Calculate percentage contribution of each nutrient to total drink nutrients.
    """
    total_sum = sum(v for v in totals.values() if isinstance(v, (int, float)) and v is not None)
    if total_sum == 0:
        return {k: 0 for k in totals}
    return {
        k: round((v / total_sum) * 100, 2) if isinstance(v, (int, float)) and v is not None else 0
        for k, v in totals.items()
    }

def generate_food_nutrient_comments(percentages: Dict[str, float], suggestion_type: str = "weekly") -> Dict[str, str]:
    """
    Generate personalized comments based on food nutrient intake percentages.

    Args:
        percentages (dict): Nutrient intake percentages (e.g., {"sodium_mg": 130.5, ...}).
        suggestion_type (str): Either "weekly" or "monthly".

    Returns:
        dict: Nutrient-specific comments (e.g., {"sodium_mg": "Reduce salty foods...", ...}).
    """
    comments = {}

    for nutrient, percent in percentages.items():
        if percent < 80:
            category = "low"
        elif 80 <= percent <= 120:
            category = "balanced"
        else:
            category = "high"

        comment = FOOD_COMMENTS.get(nutrient, {}).get(category) or f"No specific comment for {nutrient} ({category})"

        comments[nutrient] = comment

    return comments

def generate_drink_nutrient_comments(percentages: dict, suggestion_type: str = "weekly") -> dict:
    """
    Generate comments based on drink nutrient intake percentages.
    """
    comments = {}
    for nutrient, percent in percentages.items():
        if percent < 80:
            category = "low"
        elif 80 <= percent <= 120:
            category = "balanced"
        else:
            category = "high"

        comment = (
            DRINK_COMMENTS.get(nutrient, {}).get(category)
            or f"No specific comment for {nutrient} ({category})"
        )
        comments[nutrient] = comment
    return comments