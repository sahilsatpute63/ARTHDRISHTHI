import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# services/transaction_service.py
write_file("backend/app/services/transaction_service.py", """from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from datetime import datetime

def get_transactions(db: Session, user_id: int):
    return db.query(Transaction).filter(Transaction.user_id == user_id).all()

def create_transaction(db: Session, user_id: int, tx_data: dict):
    tx = Transaction(user_id=user_id, **tx_data)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx
""")

# schemas/transaction.py
write_file("backend/app/schemas/transaction.py", """from pydantic import BaseModel
from typing import Optional
from datetime import date

class TransactionBase(BaseModel):
    merchant: str
    description: str
    amount: float
    currency: str = "INR"
    transaction_type: str
    category_id: str
    transaction_date: date
    is_recurring: bool = False

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True
""")

# api/v1/transactions.py (update)
write_file("backend/app/api/v1/transactions.py", """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.transaction_service import get_transactions, create_transaction
from app.schemas.transaction import TransactionCreate, TransactionResponse
# from app.api.v1.auth import get_current_user # Need auth dependency

router = APIRouter()

@router.get("/", response_model=list[TransactionResponse])
def read_transactions(db: Session = Depends(get_db)):
    # fake user_id for now
    return get_transactions(db, user_id=1)

@router.post("/", response_model=TransactionResponse)
def add_transaction(tx: TransactionCreate, db: Session = Depends(get_db)):
    return create_transaction(db, user_id=1, tx_data=tx.model_dump())
""")

print("Phase 6 transactions complete")
