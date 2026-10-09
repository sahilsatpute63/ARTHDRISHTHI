from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal
from app.db.session import get_db
from app.services.optimization_service import optimize_goals

router = APIRouter()

class OptimizeRequest(BaseModel):
    available_monthly_savings: float
    minimum_reserve_preserved: bool
    goals: list[dict]

@router.get("/")
def get_goals(db: Session = Depends(get_db)):
    return []

@router.post("/optimize")
def optimize_user_goals(req: OptimizeRequest, db: Session = Depends(get_db)):
    return optimize_goals(
        Decimal(str(req.available_monthly_savings)),
        req.minimum_reserve_preserved,
        req.goals
    )
