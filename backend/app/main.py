"""Zauberkoch API — FastAPI application factory."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_router
from app.core.config import get_settings
from app.core.logging import setup_logging

logger = logging.getLogger("zauberkoch")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("zauberkoch api starting")
    yield
    logger.info("zauberkoch api stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Zauberkoch API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/v1/docs" if not settings.is_prod else None,
        redoc_url=None,
        openapi_url="/api/v1/openapi.json" if not settings.is_prod else None,
    )

    app.include_router(api_router, prefix="/api/v1")

    # Crawler-facing share pages (/r/{token}) — proxied by nginx, no /api prefix
    from app.api.v1.share import html_router

    app.include_router(html_router)

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        detail = exc.detail if isinstance(exc.detail, dict) else {"code": "http_error", "message": str(exc.detail)}
        return JSONResponse(status_code=exc.status_code, content={"error": detail}, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "validation_error", "message": "Ungültige Eingabe.", "details": exc.errors()}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.exception("unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error", "message": "Interner Fehler."}},
        )

    return app


app = create_app()
