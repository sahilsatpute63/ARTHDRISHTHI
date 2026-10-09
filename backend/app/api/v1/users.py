from fastapi import APIRouter
router = APIRouter()
@router.get("/me")
def read_users_me():
    return {}
