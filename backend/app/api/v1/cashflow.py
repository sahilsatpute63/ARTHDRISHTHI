from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from decimal import Decimal
from app.db.session import get_db
from app.services.transaction_service import get_transactions
from app.services.forecasting_service import generate_forecast
from app.api.deps import get_current_user
from app.models.user import User
from app.models.settings import UserSettings

router = APIRouter()

@router.get("/forecast")
def get_forecast(horizon_days: int = 7, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txs = get_transactions(db, user_id=current_user.id)
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    minimum_reserve = Decimal(str(settings_obj.minimum_reserve)) if settings_obj else Decimal('5000.00')

    total_income = sum((Decimal(str(t.amount)) for t in txs if t.transaction_type == 'income'), Decimal('0.00'))
    total_expense = sum((Decimal(str(abs(t.amount))) for t in txs if t.transaction_type == 'expense'), Decimal('0.00'))
    current_balance = total_income - total_expense

    return generate_forecast(txs, current_balance, horizon_days, minimum_reserve)
