from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal
from app.db.session import get_db
from app.services.transaction_service import get_transactions
from app.services.domino_service import simulate_domino
from app.api.deps import get_current_user
from app.models.user import User
from app.models.settings import UserSettings

router = APIRouter()

class DominoRequest(BaseModel):
    event_amount: float
    event_type: str
    horizon_days: int = 7

@router.post("/simulate")
def simulate(req: DominoRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txs = get_transactions(db, user_id=current_user.id)
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    minimum_reserve = Decimal(str(settings_obj.minimum_reserve)) if settings_obj else Decimal('5000.00')

    total_income = sum((Decimal(str(t.amount)) for t in txs if t.transaction_type == 'income'), Decimal('0.00'))
    total_expense = sum((Decimal(str(abs(t.amount))) for t in txs if t.transaction_type == 'expense'), Decimal('0.00'))
    current_balance = total_income - total_expense

    return simulate_domino(
        Decimal(str(req.event_amount)),
        req.event_type,
        txs,
        current_balance,
        minimum_reserve,
        req.horizon_days
    )
