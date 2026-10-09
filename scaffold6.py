import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

write_file("backend/app/api/v1/dashboard.py", """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.transaction_service import get_transactions

router = APIRouter()

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    txs = get_transactions(db, user_id=1)
    
    # Mock return using format matching frontend
    return {
      "account": {
        "availableBalance": 56874,
        "lastMonthBalance": 50780,
        "reserveBuffer": 7000,
        "monthlyGoalContribution": 5000,
        "monthlyExpenses": 21000,
        "rent": 8000,
      },
      "settings": {
        "minimumReserve": 5000,
        "forecastDays": 7,
        "notifications": {
          "lowBalance": True,
          "goalMilestones": True,
          "weeklyDigest": False,
          "dominoAlerts": True,
        },
      },
      "transactions": [
        {"id": "t01", "merchant": "API Zomato", "description": "Food & Dining", "amount": -450, "category": "Food", "date": "2024-10-14", "method": "UPI"}
      ],
      "goals": [
        {"id": "g1", "name": "Emergency Fund", "current": 20000, "target": 50000, "icon": "shield", "tone": "gold"}
      ],
      "health": {
        "score": 85,
        "label": "Great",
        "split": [
          {"key": "Needs", "value": 50, "color": "#064E49"},
          {"key": "Wants", "value": 30, "color": "#D9B45B"},
          {"key": "Savings", "value": 20, "color": "#8DBA8A"},
        ],
        "factors": []
      },
      "forecast": {
        "startDate": "2024-10-14",
        "sevenDay": [11000, 29000, 33567, 18000, 11000, 27000, 22000],
      },
      "sparklines": {
        "balance": [8, 12, 7, 13, 9, 15, 10, 16, 11, 17, 12, 18],
        "income": [9, 13, 8, 12, 10, 14, 9, 15, 11, 16, 10, 17],
      },
      "insights": [],
      "notifications": [],
      "upcomingBills": []
    }
""")
