from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app import models, database
from app.security import get_current_user
from app.utils import (
    calculate_food_nutrient_percentages,
    calculate_food_field_distribution_percentages,
    calculate_drink_nutrient_percentages,
    calculate_drink_field_distribution_percentages
)

router = APIRouter()

def get_food_logs_for_period(user_id, db: Session, days: int):
    """
    Fetch food logs for a given user in the past `days` number of days.
    Converts intake_time to UTC and filters by date range.
    """
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    all_food_logs = db.query(models.Food).filter(
        models.Food.user_id == user_id
    ).order_by(models.Food.intake_time).all()

    # Filter by aware date range
    filtered_logs = []
    for food in all_food_logs:
        if food.intake_time:
            intake_time = (
                food.intake_time.replace(tzinfo=timezone.utc)
                if food.intake_time.tzinfo is None
                else food.intake_time.astimezone(timezone.utc)
            )
            if start_date <= intake_time <= end_date:
                filtered_logs.append(food)

    return start_date, end_date, filtered_logs


def food_aggregate_nutrients(food_logs):
    """
    Sum up nutrient values from a list of food logs.
    """
    totals = {
        "calories": 0,
        "sugar_g": 0,
        "sodium_mg": 0,
        "fat_g": 0,
        "protein_g": 0,
        "carbohydrates_g": 0,
        "cholesterol_mg": 0
    }

    for food in food_logs:
        totals["calories"] += food.calories_estimate or 0
        totals["sugar_g"] += food.sugar_g or 0
        totals["sodium_mg"] += food.sodium_mg or 0
        totals["fat_g"] += food.fat_g or 0
        totals["protein_g"] += food.protein_g or 0
        totals["carbohydrates_g"] += food.carbohydrates_g or 0
        totals["cholesterol_mg"] += food.cholesterol_mg or 0

    return totals


def build_food_nutrition_report(user_id, start_date, end_date, totals):
    """
    Generate JSON response for analysis.
    """
    return {
        "user_id": str(user_id),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "totals": totals,
        "percentages_rda": calculate_food_nutrient_percentages(totals),
        "percentages_distribution": calculate_food_field_distribution_percentages(totals),
    }


@router.get("/weekly-food")
def get_weekly_nutrition_analysis(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """
    Weekly food nutrition analysis (past 7 days)
    """
    start_date, end_date, food_logs = get_food_logs_for_period(
        user_id=current_user.user_id,
        db=db,
        days=14
    )
    totals = food_aggregate_nutrients(food_logs)
    return build_food_nutrition_report(current_user.user_id, start_date, end_date, totals)


@router.get("/monthly-food")
def get_monthly_nutrition_analysis(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """
    Monthly food nutrition analysis (past 30 days)
    """
    start_date, end_date, food_logs = get_food_logs_for_period(
        user_id=current_user.user_id,
        db=db,
        days=30
    )
    totals = food_aggregate_nutrients(food_logs)
    return build_food_nutrition_report(current_user.user_id, start_date, end_date, totals)


def get_drink_logs_for_period(user_id, db: Session, days: int):
    """
    Fetch drink logs for a given user in the past `days` number of days.
    Converts intake_time to UTC and filters by date range.
    """
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    all_drink_logs = db.query(models.Drink).filter(
        models.Drink.user_id == user_id
    ).order_by(models.Drink.drink_time).all()

    # Filter by aware date range
    filtered_logs = []
    for drink in all_drink_logs:
        if drink.drink_time:
            intake_time = (
                drink.drink_time.replace(tzinfo=timezone.utc)
                if drink.drink_time.tzinfo is None
                else drink.drink_time.astimezone(timezone.utc)
            )
            if start_date <= intake_time <= end_date:
                filtered_logs.append(drink)

    return start_date, end_date, filtered_logs


def drink_aggregate_nutrients(drink_logs):
    """
    Sum up nutrient values from a list of drink logs.
    """
    totals = {
        "sugar_g": 0,
        "calories": 0,
        "caffeine_mg": 0,
        "sodium_mg": 0,
        "potassium_mg": 0
    }

    for drink in drink_logs:
        totals["sugar_g"] += drink.sugar_g or 0
        totals["calories"] += drink.calories or 0
        totals["caffeine_mg"] += drink.caffeine_mg or 0
        totals["sodium_mg"] += drink.sodium_mg or 0
        totals["potassium_mg"] += drink.potassium_mg or 0

    return totals


def build_drink_nutrition_report(user_id, start_date, end_date, totals):
    """
    Generate JSON response for analysis.
    """
    return {
        "user_id": str(user_id),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "totals": totals,
        "percentages_rda": calculate_drink_nutrient_percentages(totals),
        "percentages_distribution": calculate_drink_field_distribution_percentages(totals),
    }


@router.get("/drink-weekly")
def get_weekly_nutrition_analysis(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """
    Weekly drink nutrition analysis (past 7 days)
    """
    start_date, end_date, drink_logs = get_drink_logs_for_period(
        user_id=current_user.user_id,
        db=db,
        days=14
    )
    totals = drink_aggregate_nutrients(drink_logs)
    return build_drink_nutrition_report(current_user.user_id, start_date, end_date, totals)


@router.get("/drink-monthly")
def get_monthly_nutrition_analysis(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """
    Monthly drink nutrition analysis (past 30 days)
    """
    start_date, end_date, drink_logs = get_drink_logs_for_period(
        user_id=current_user.user_id,
        db=db,
        days=30
    )
    totals = drink_aggregate_nutrients(drink_logs)
    return build_drink_nutrition_report(current_user.user_id, start_date, end_date, totals)
