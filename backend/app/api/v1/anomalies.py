from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.transaction_service import get_transactions
from app.services.anomaly_service import detect_anomalies
from app.api.deps import get_current_user
from app.models.user import User


router = APIRouter()

@router.get("/")
def get_anomalies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txs = get_transactions(db, user_id=current_user.id)
    return detect_anomalies(txs)
