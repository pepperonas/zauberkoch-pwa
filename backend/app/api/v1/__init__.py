from fastapi import APIRouter

from app.api.v1 import auth, favorites, health, me, recipes, shopping

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(me.router, tags=["me"])
api_router.include_router(recipes.router, tags=["recipes"])
api_router.include_router(favorites.router, tags=["favorites"])
api_router.include_router(shopping.router, tags=["shopping"])
