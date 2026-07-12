from fastapi import APIRouter

from app.api.v1 import admin, auth, favorites, health, me, plan, recipes, share, shopping

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(me.router, tags=["me"])
api_router.include_router(recipes.router, tags=["recipes"])
api_router.include_router(favorites.router, tags=["favorites"])
api_router.include_router(shopping.router, tags=["shopping"])
api_router.include_router(plan.router, tags=["plan"])
api_router.include_router(share.router, tags=["share"])
api_router.include_router(admin.router, tags=["admin"])
