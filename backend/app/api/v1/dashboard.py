from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import datetime, timedelta, date

from app.api import deps
from app.models.transaction import Transaction
from app.models.goal import Goal
from app.models.settings import UserSettings
from app.services.forecasting_service import generate_forecast
from app.services.anomaly_service import detect_anomalies
from app.services.insight_service import generate_insights

router = APIRouter()

@router.get("/overview")
def get_dashboard_overview(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.transaction_date.desc(), Transaction.id.desc())
        .all()
    )
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    settings_obj = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()

    minimum_reserve = float(settings_obj.minimum_reserve) if settings_obj else 5000.0
    forecast_days = int(settings_obj.forecast_horizon_days) if settings_obj else 7

    # 1. Transactions formatting
    formatted_transactions = [
        {
            "id": f"tx_{t.id}",
            "merchant": t.merchant or "Unknown",
            "description": t.description or "",
            "amount": float(t.amount if t.transaction_type == "income" else -abs(t.amount)),
            "category": t.category_id or "Other",
            "date": t.transaction_date.strftime("%Y-%m-%d") if t.transaction_date else "",
            "method": t.source or "Imported"
        }
        for t in transactions
    ]

    income_txs = [t for t in transactions if t.transaction_type == "income"]
    expense_txs = [t for t in transactions if t.transaction_type == "expense"]

    total_income = sum(float(t.amount) for t in income_txs)
    total_expenses = sum(float(abs(t.amount)) for t in expense_txs)
    available_balance = total_income - total_expenses

    # Monthly groupings
    now = datetime.utcnow()
    current_month_key = now.strftime("%Y-%m")
    
    # If no transactions in current month, take the month of the latest transaction
    if transactions:
        latest_tx_date = transactions[0].transaction_date
        latest_month_key = latest_tx_date.strftime("%Y-%m") if latest_tx_date else current_month_key
    else:
        latest_month_key = current_month_key

    # Previous month key
    try:
        y, m = map(int, latest_month_key.split("-"))
        prev_month_date = date(y, m, 1) - timedelta(days=1)
        prev_month_key = prev_month_date.strftime("%Y-%m")
    except Exception:
        prev_month_key = ""

    monthly_income = sum(
        float(t.amount) for t in income_txs 
        if t.transaction_date and t.transaction_date.strftime("%Y-%m") == latest_month_key
    )
    monthly_expenses = sum(
        float(abs(t.amount)) for t in expense_txs 
        if t.transaction_date and t.transaction_date.strftime("%Y-%m") == latest_month_key
    )
    prev_month_balance = sum(
        float(t.amount if t.transaction_type == "income" else -abs(t.amount))
        for t in transactions
        if t.transaction_date and t.transaction_date.strftime("%Y-%m") <= prev_month_key
    )

    rent = sum(
        float(abs(t.amount)) for t in expense_txs
        if (t.category_id or "").lower() in ["housing", "rent"] 
        and t.transaction_date and t.transaction_date.strftime("%Y-%m") == latest_month_key
    )

    reserve_buffer = max(0.0, available_balance - minimum_reserve)

    # 2. Categories
    cat_set = set(t.category_id for t in transactions if t.category_id)
    default_cats = ["Food", "Income", "Shopping", "Education", "Transport", "Housing", "Utilities", "Health", "Entertainment"]
    for c in default_cats:
        cat_set.add(c)
    categories_list = sorted(list(cat_set))

    # 3. Health score calculation
    if not transactions:
        health_data = {
            "score": 0,
            "label": "No Data",
            "split": [
                {"key": "Needs", "value": 0, "color": "#064E49"},
                {"key": "Wants", "value": 0, "color": "#D9B45B"},
                {"key": "Savings", "value": 0, "color": "#8DBA8A"},
            ],
            "factors": [
                {"name": "Spending discipline", "score": 0, "note": "No transactions imported yet."},
                {"name": "Savings rate", "score": 0, "note": "0% saved."},
                {"name": "Reserve coverage", "score": 0, "note": "No reserve buffer calculated."},
                {"name": "Goal progress", "score": 0, "note": "No goals funded yet."},
            ]
        }
    else:
        needs_cats = {"housing", "rent", "utilities", "bills", "groceries", "food", "transport", "health", "medical", "education"}
        needs_spend = sum(float(abs(t.amount)) for t in expense_txs if (t.category_id or "").lower() in needs_cats)
        wants_spend = sum(float(abs(t.amount)) for t in expense_txs if (t.category_id or "").lower() not in needs_cats)
        net_savings = max(0.0, total_income - total_expenses)

        if total_income > 0:
            needs_pct = min(100, round((needs_spend / total_income) * 100))
            wants_pct = min(100 - needs_pct, round((wants_spend / total_income) * 100))
            savings_pct = max(0, 100 - needs_pct - wants_pct)
        elif total_expenses > 0:
            needs_pct = min(100, round((needs_spend / total_expenses) * 100))
            wants_pct = max(0, 100 - needs_pct)
            savings_pct = 0
        else:
            needs_pct, wants_pct, savings_pct = 0, 0, 0

        # Discipline score (needs <= 60% of income is good)
        if total_income > 0:
            disp_score = max(0, min(100, round(100 - (needs_spend / total_income) * 60)))
            sav_score = max(0, min(100, round((net_savings / total_income) * 200)))
        else:
            disp_score = 30
            sav_score = 0

        res_score = 90 if available_balance >= minimum_reserve else (50 if available_balance > 0 else 10)
        goal_score = 75 if goals else 50
        overall_score = round(0.35 * disp_score + 0.35 * sav_score + 0.20 * res_score + 0.10 * goal_score)

        if overall_score >= 80:
            label = "Excellent"
        elif overall_score >= 65:
            label = "Good"
        elif overall_score >= 45:
            label = "Fair"
        else:
            label = "Needs Attention"

        health_data = {
            "score": overall_score,
            "label": label,
            "split": [
                {"key": "Needs", "value": needs_pct, "color": "#064E49"},
                {"key": "Wants", "value": wants_pct, "color": "#D9B45B"},
                {"key": "Savings", "value": savings_pct, "color": "#8DBA8A"},
            ],
            "factors": [
                {"name": "Spending discipline", "score": disp_score, "note": f"Needs consume {needs_pct}% of total income."},
                {"name": "Savings rate", "score": sav_score, "note": f"{savings_pct}% saved from recorded transactions."},
                {"name": "Reserve coverage", "score": res_score, "note": f"Balance is {'above' if available_balance >= minimum_reserve else 'below'} the minimum reserve of ₹{minimum_reserve:,.0f}."},
                {"name": "Goal progress", "score": goal_score, "note": f"{len(goals)} active financial goal(s) registered."},
            ]
        }

    # 4. Forecast
    if not transactions:
        forecast_data = {
            "startDate": datetime.utcnow().strftime("%Y-%m-%d"),
            "sevenDay": [0.0] * forecast_days
        }
    else:
        fc = generate_forecast(
            transactions,
            Decimal(str(round(available_balance, 2))),
            forecast_days,
            Decimal(str(round(minimum_reserve, 2)))
        )
        points = [float(pt["projected_balance"]) for pt in fc.get("forecast", [])]
        while len(points) < forecast_days:
            points.append(float(round(available_balance, 2)))
        forecast_data = {
            "startDate": datetime.utcnow().strftime("%Y-%m-%d"),
            "sevenDay": points
        }

    # 5. Sparklines
    if not transactions:
        sparklines_data = {
            "balance": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            "income": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        }
    else:
        # Construct timeline based on transactions
        chronological_tx = sorted(transactions, key=lambda x: (x.transaction_date or date.min, x.id))
        rolling_bal = 0.0
        bal_points = []
        inc_points = []
        for t in chronological_tx:
            amt = float(t.amount if t.transaction_type == "income" else -abs(t.amount))
            rolling_bal += amt
            bal_points.append(rolling_bal)
            if t.transaction_type == "income":
                inc_points.append(float(t.amount))

        # Sample 10 points
        def sample_series(arr, n=10):
            if not arr:
                return [0.0] * n
            if len(arr) <= n:
                return arr + [arr[-1]] * (n - len(arr))
            step = len(arr) / n
            return [arr[int(i * step)] for i in range(n)]

        sparklines_data = {
            "balance": sample_series(bal_points, 12),
            "income": sample_series(inc_points, 12)
        }

    # 6. Real Insights
    if not transactions:
        insights_data = [
            {
                "id": "i_empty",
                "title": "No Transactions Imported",
                "tone": "info",
                "evidence": "Import your bank statement to see real-time financial insights.",
                "explanation": "Once you upload a statement (CSV, Excel, or PDF), ARTHDRISHTI will automatically analyze your cash flow and detect spending patterns.",
                "page": "transactions",
                "linkLabel": "Import Statement"
            }
        ]
    else:
        thirty_days_ago = date.today() - timedelta(days=30)
        sixty_days_ago = date.today() - timedelta(days=60)
        cur_tx = [t for t in transactions if t.transaction_date and t.transaction_date >= thirty_days_ago]
        prev_tx = [t for t in transactions if t.transaction_date and sixty_days_ago <= t.transaction_date < thirty_days_ago]
        fc_obj = generate_forecast(transactions, Decimal(str(available_balance)), 7, Decimal(str(minimum_reserve)))
        anomalies_list = detect_anomalies(transactions)
        raw_insights = generate_insights(cur_tx, prev_tx, fc_obj, [{"name": g.name, "target": g.target_amount} for g in goals], anomalies_list)

        insights_data = []
        for ins in raw_insights:
            sev = ins.get("severity", "info")
            tone = "danger" if sev == "high" else ("warning" if sev == "medium" else "success")
            insights_data.append({
                "id": ins.get("id", "i_item"),
                "title": ins.get("title", "Insight"),
                "tone": tone,
                "evidence": ins.get("evidence", ""),
                "explanation": ins.get("explanation", ""),
                "page": "transactions",
                "linkLabel": "Review Transactions"
            })

        if not insights_data:
            insights_data.append({
                "id": "i_healthy",
                "title": "Healthy Financial Flow",
                "tone": "success",
                "evidence": f"Total income recorded: ₹{total_income:,.0f} across {len(income_txs)} deposits.",
                "explanation": "Your finances look stable based on the imported transaction history.",
                "page": "transactions",
                "linkLabel": "View All Transactions"
            })

    # 7. Goals
    formatted_goals = [
        {
            "id": f"g_{g.id}",
            "name": g.name,
            "current": float(g.current_amount or 0.0),
            "target": float(g.target_amount or 0.0),
            "icon": "shield" if "emergency" in (g.name or "").lower() else ("laptop" if "laptop" in (g.name or "").lower() else ("cap" if "education" in (g.name or "").lower() else "target")),
            "tone": "gold" if "emergency" in (g.name or "").lower() else "blue"
        }
        for g in goals
    ]

    # 8. Notifications
    notifications_data = []
    if available_balance < minimum_reserve and transactions:
        notifications_data.append({
            "id": "n_low_bal",
            "title": "Reserve Alert",
            "body": f"Available balance of ₹{available_balance:,.0f} is below your minimum reserve.",
            "time": "Just now",
            "page": "cashflow",
            "unread": True
        })
    elif transactions:
        notifications_data.append({
            "id": "n_synced",
            "title": "Transactions Synced",
            "body": f"{len(transactions)} transactions successfully tracked.",
            "time": "Recent",
            "page": "transactions",
            "unread": False
        })
    else:
        notifications_data.append({
            "id": "n_welcome",
            "title": "Welcome to ARTHDRISHTI",
            "body": "Import your first bank statement to begin financial forecasting.",
            "time": "Just now",
            "page": "transactions",
            "unread": True
        })

    # 9. Upcoming bills from recurring expenses
    upcoming_bills_data = []
    recurring_expenses = [t for t in expense_txs if t.is_recurring]
    for r in recurring_expenses[:5]:
        upcoming_bills_data.append({
            "name": r.merchant,
            "amount": float(abs(r.amount)),
            "due": (date.today() + timedelta(days=15)).strftime("%Y-%m-%d")
        })

    return {
        "user": {
            "name": current_user.full_name or current_user.email.split("@")[0],
            "email": current_user.email
        },
        "account": {
            "availableBalance": round(available_balance, 2),
            "lastMonthBalance": round(prev_month_balance, 2),
            "reserveBuffer": round(reserve_buffer, 2),
            "monthlyGoalContribution": sum(float(g.monthly_contribution or 0.0) for g in goals),
            "monthlyExpenses": round(monthly_expenses, 2),
            "rent": round(rent, 2)
        },
        "settings": {
            "minimumReserve": minimum_reserve,
            "forecastDays": forecast_days,
            "notifications": {
                "lowBalance": True,
                "goalMilestones": True,
                "weeklyDigest": False,
                "dominoAlerts": True
            }
        },
        "categories": categories_list,
        "transactions": formatted_transactions,
        "goals": formatted_goals,
        "health": health_data,
        "forecast": forecast_data,
        "sparklines": sparklines_data,
        "insights": insights_data,
        "notifications": notifications_data,
        "upcomingBills": upcoming_bills_data,
        "goalContribution": sum(float(g.monthly_contribution or 0.0) for g in goals)
    }
