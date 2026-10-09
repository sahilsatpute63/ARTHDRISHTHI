from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime, timedelta, date
from app.db.session import get_db
from app.services.transaction_service import get_transactions
from app.services.insight_service import generate_insights
from app.services.forecasting_service import generate_forecast
from app.services.anomaly_service import detect_anomalies
from app.api.deps import get_current_user
from app.models.user import User
from app.models.settings import UserSettings
from app.models.goal import Goal

router = APIRouter()

@router.get("/")
def get_insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txs = get_transactions(db, user_id=current_user.id)
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    minimum_reserve = Decimal(str(settings_obj.minimum_reserve)) if settings_obj else Decimal('5000.00')

    total_income = sum((Decimal(str(t.amount)) for t in txs if t.transaction_type == 'income'), Decimal('0.00'))
    total_expense = sum((Decimal(str(abs(t.amount))) for t in txs if t.transaction_type == 'expense'), Decimal('0.00'))
    current_balance = total_income - total_expense

    today = date.today()
    thirty_days_ago = today - timedelta(days=30)
    sixty_days_ago = today - timedelta(days=60)
    
    current_tx = [t for t in txs if t.transaction_date and t.transaction_date >= thirty_days_ago]
    prev_tx = [t for t in txs if t.transaction_date and sixty_days_ago <= t.transaction_date < thirty_days_ago]
    
    forecast = generate_forecast(txs, current_balance, 7, minimum_reserve)
    anomalies = detect_anomalies(txs)
    
    goals_db = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    goals = [{"name": g.name, "target_amount": g.target_amount, "current_amount": g.current_amount} for g in goals_db]
    
    return generate_insights(current_tx, prev_tx, forecast, goals, anomalies)
