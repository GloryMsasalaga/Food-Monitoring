from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from app import models, database
from app.security import get_current_user
from app.utils import (
    calculate_nutrient_percentages,
    calculate_field_distribution_percentages
)

router = APIRouter(prefix="/analysis", tags=["Analysis"])


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


def aggregate_nutrients(food_logs):
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


def build_nutrition_report(user_id, start_date, end_date, totals):
    """
    Generate JSON response for analysis.
    """
    return {
        "user_id": str(user_id),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "totals": totals,
        "percentages_rda": calculate_nutrient_percentages(totals),
        "percentages_distribution": calculate_field_distribution_percentages(totals),
    }


@router.get("/weekly")
def get_weekly_nutrition_analysis(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """
    Weekly nutrition analysis (past 7 days)
    """
    start_date, end_date, food_logs = get_food_logs_for_period(
        user_id=current_user.user_id,
        db=db,
        days=14
    )
    totals = aggregate_nutrients(food_logs)
    return build_nutrition_report(current_user.user_id, start_date, end_date, totals)


@router.get("/monthly")
def get_monthly_nutrition_analysis(
    db: Session = Depends(database.get_db),
    current_user=Depends(get_current_user)
):
    """
    Monthly nutrition analysis (past 30 days)
    """
    start_date, end_date, food_logs = get_food_logs_for_period(
        user_id=current_user.user_id,
        db=db,
        days=30
    )
    totals = aggregate_nutrients(food_logs)
    return build_nutrition_report(current_user.user_id, start_date, end_date, totals)
