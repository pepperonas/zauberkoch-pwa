from fastapi import APIRouter

from app.api.v1 import auth, health, me, recipes

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(me.router, tags=["me"])
api_router.include_router(recipes.router, tags=["recipes"])
