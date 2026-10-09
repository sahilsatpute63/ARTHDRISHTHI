import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

# models/transaction.py
write_file("backend/app/models/transaction.py", """from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.sql import func
from app.db.base import Base

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    external_reference = Column(String, nullable=True)
    merchant = Column(String, index=True)
    description = Column(String)
    amount = Column(Float)
    currency = Column(String, default="INR")
    transaction_type = Column(String) # income, expense, transfer
    category_id = Column(String, index=True)
    transaction_date = Column(Date, index=True)
    is_recurring = Column(Boolean, default=False)
    source = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
""")

# models/goal.py
write_file("backend/app/models/goal.py", """from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.sql import func
from app.db.base import Base

class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String)
    goal_type = Column(String)
    target_amount = Column(Float)
    current_amount = Column(Float, default=0.0)
    target_date = Column(Date, nullable=True)
    priority = Column(Integer, default=1)
    monthly_contribution = Column(Float, default=0.0)
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
""")

# models/settings.py
write_file("backend/app/models/settings.py", """from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class UserSettings(Base):
    __tablename__ = "user_settings"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True, index=True)
    currency = Column(String, default="INR")
    minimum_reserve = Column(Float, default=5000.0)
    forecast_horizon_days = Column(Integer, default=7)
    notification_preferences = Column(String, default="{}")
    timezone = Column(String, default="UTC")
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
""")

# init db
write_file("backend/app/db/init_db.py", """from app.db.session import engine
from app.db.base import Base
from app.models.user import User
from app.models.transaction import Transaction
from app.models.goal import Goal
from app.models.settings import UserSettings

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
""")

print("Phase 4 models complete")
