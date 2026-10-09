from fastapi import APIRouter
router = APIRouter()
@router.get("/")
def get_health():
    return {"score": 82, "label": "Good"}
