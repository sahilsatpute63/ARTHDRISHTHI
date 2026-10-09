from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, date
import hashlib
import uuid
from app.api import deps
from app.services import transaction_service
from app.services.import_service import parse_document
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.models.transaction import Transaction

router = APIRouter()

IMPORT_SESSIONS: Dict[str, Any] = {}

def get_transaction_fingerprint(user_id: int, txn: dict) -> str:
    merchant = txn.get('merchant', '')[:30].lower()
    t_date = txn.get('transaction_date', '')
    amount = str(txn.get('amount', ''))
    s = f"{user_id}-{t_date}-{amount}-{merchant}"
    return hashlib.md5(s.encode()).hexdigest()

@router.post("/import/preview")
async def import_preview(
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    ext = file.filename.lower().split('.')[-1]
    if ext not in ['csv', 'xlsx', 'xls', 'pdf']:
        raise HTTPException(status_code=400, detail="Unsupported file format")
        
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
        
    result = parse_document(file_bytes, file.filename)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    transactions = result.get("transactions", [])
    
    # Duplicate detection against DB
    existing_txns = transaction_service.get_transactions(db, user_id=current_user.id, limit=10000)
    existing_hashes = set()
    for et in existing_txns:
        # Reconstruct hash logic for existing
        merchant = et.merchant[:30].lower() if et.merchant else ''
        date = et.transaction_date.strftime('%Y-%m-%d') if et.transaction_date else ''
        amount = str(abs(et.amount)) if et.amount else ''
        s = f"{current_user.id}-{date}-{amount}-{merchant}"
        existing_hashes.add(hashlib.md5(s.encode()).hexdigest())

    duplicate_rows = 0
    preview = []
    
    for idx, txn in enumerate(transactions):
        txn_hash = get_transaction_fingerprint(current_user.id, txn)
        is_duplicate = txn_hash in existing_hashes
        if is_duplicate:
            duplicate_rows += 1
            
        preview_item = {
            "index": idx,
            "is_duplicate": is_duplicate,
            **txn
        }
        preview.append(preview_item)
        
    import_id = str(uuid.uuid4())
    IMPORT_SESSIONS[import_id] = {
        "user_id": current_user.id,
        "transactions": preview
    }
    
    return {
        "import_id": import_id,
        "filename": file.filename,
        "total_rows": result.get("total_rows", 0),
        "valid_rows": max(0, result.get("valid_rows", 0) - duplicate_rows),
        "duplicate_rows": duplicate_rows,
        "preview": preview,
        "warnings": result.get("warnings", [])
    }

@router.post("/import/confirm")
def import_confirm(
    import_id: str = Body(...),
    excluded_indices: List[int] = Body([]),
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    session = IMPORT_SESSIONS.get(import_id)
    if not session:
        raise HTTPException(status_code=404, detail="Import session not found or expired")
        
    if session["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized for this import session")
        
    preview_txns = session["transactions"]
    
    imported_count = 0
    skipped_count = len(excluded_indices)
    imported_txns = []
    
    try:
        for idx, txn_data in enumerate(preview_txns):
            if idx in excluded_indices:
                continue
                
            # Parse date safely
            tx_date = txn_data.get("transaction_date")
            if isinstance(tx_date, str):
                try:
                    tx_date = datetime.strptime(tx_date, "%Y-%m-%d").date()
                except Exception:
                    tx_date = date.today()
            elif not tx_date:
                tx_date = date.today()

            # Create transaction
            txn_create = Transaction(
                user_id=current_user.id,
                transaction_date=tx_date,
                merchant=txn_data.get("merchant") or "Unknown",
                description=txn_data.get("description") or "",
                amount=float(abs(txn_data.get("amount", 0.0))),
                transaction_type=txn_data.get("transaction_type") or "expense",
                category_id=txn_data.get("category_id") or "Other",
                external_reference=txn_data.get("external_reference"),
                source=txn_data.get("source") or txn_data.get("payment_method") or "Imported"
            )
            db.add(txn_create)
            imported_count += 1
            imported_txns.append(txn_create)
            
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during import: {str(e)}")
        
    # Clean up session
    del IMPORT_SESSIONS[import_id]
    
    return {
        "status": "success",
        "imported_count": imported_count,
        "skipped_count": skipped_count,
        "transactions": [
            {
                "id": t.id,
                "merchant": t.merchant,
                "amount": t.amount,
                "transaction_date": t.transaction_date.strftime('%Y-%m-%d') if hasattr(t.transaction_date, 'strftime') else str(t.transaction_date)
            } for t in imported_txns
        ]
    }

# Keep existing GET and POST endpoints
@router.get("/")
def get_transactions(
    skip: int = 0, limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    return transaction_service.get_transactions(db=db, user_id=current_user.id, skip=skip, limit=limit)

@router.post("/", response_model=TransactionResponse)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_user)
):
    return transaction_service.create_transaction(db=db, transaction=transaction, user_id=current_user.id)
