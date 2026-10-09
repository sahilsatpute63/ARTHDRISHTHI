import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# api/v1/cashflow.py
write_file("backend/app/api/v1/cashflow.py", """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from decimal import Decimal
from app.db.session import get_db
from app.services.transaction_service import get_transactions
from app.services.forecasting_service import generate_forecast

router = APIRouter()

@router.get("/forecast")
def get_forecast(horizon_days: int = 7, db: Session = Depends(get_db)):
    txs = get_transactions(db, user_id=1)
    # mock starting balance and minimum reserve
    return generate_forecast(txs, Decimal('56874.00'), horizon_days, Decimal('5000.00'))
""")

# api/v1/goals.py
write_file("backend/app/api/v1/goals.py", """from fastapi import APIRouter, Depends
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
""")

# api/v1/anomalies.py
write_file("backend/app/api/v1/anomalies.py", """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.transaction_service import get_transactions
from app.services.anomaly_service import detect_anomalies

router = APIRouter()

@router.get("/")
def get_anomalies(db: Session = Depends(get_db)):
    txs = get_transactions(db, user_id=1)
    return detect_anomalies(txs)
""")

# api/v1/domino.py
write_file("backend/app/api/v1/domino.py", """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal
from app.db.session import get_db
from app.services.transaction_service import get_transactions
from app.services.domino_service import simulate_domino

router = APIRouter()

class DominoRequest(BaseModel):
    event_amount: float
    event_type: str
    horizon_days: int = 7

@router.post("/simulate")
def simulate(req: DominoRequest, db: Session = Depends(get_db)):
    txs = get_transactions(db, user_id=1)
    return simulate_domino(
        Decimal(str(req.event_amount)),
        req.event_type,
        txs,
        Decimal('56874.00'),
        Decimal('5000.00'),
        req.horizon_days
    )
""")

# main.py update to include anomalies
write_file("backend/app/main.py", """from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, users, dashboard, transactions, categories, health, cashflow, domino, goals, simulator, insights, reports, settings, anomalies
from app.core.config import settings as app_settings

app = FastAPI(title=app_settings.PROJECT_NAME)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router, prefix=f"{app_settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(dashboard.router, prefix=f"{app_settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(transactions.router, prefix=f"{app_settings.API_V1_STR}/transactions", tags=["transactions"])
app.include_router(cashflow.router, prefix=f"{app_settings.API_V1_STR}/cashflow", tags=["cashflow"])
app.include_router(goals.router, prefix=f"{app_settings.API_V1_STR}/goals", tags=["goals"])
app.include_router(anomalies.router, prefix=f"{app_settings.API_V1_STR}/anomalies", tags=["anomalies"])
app.include_router(domino.router, prefix=f"{app_settings.API_V1_STR}/domino", tags=["domino"])
app.include_router(insights.router, prefix=f"{app_settings.API_V1_STR}/insights", tags=["insights"])
app.include_router(health.router, prefix=f"{app_settings.API_V1_STR}/financial-health", tags=["health"])
app.include_router(simulator.router, prefix=f"{app_settings.API_V1_STR}/simulator", tags=["simulator"])
app.include_router(reports.router, prefix=f"{app_settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(settings.router, prefix=f"{app_settings.API_V1_STR}/settings", tags=["settings"])
app.include_router(categories.router, prefix=f"{app_settings.API_V1_STR}/categories", tags=["categories"])
""")

print("Routers generated successfully.")
