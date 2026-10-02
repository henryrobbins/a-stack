from fastapi import APIRouter, FastAPI

from app.routers import chat

app = FastAPI(title="a-stack-api")

# Vercel Services forwards the full request path, so routes live under the
# same /api/py prefix the browser uses, in every environment.
api = APIRouter(prefix="/api/py")


@api.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


api.include_router(chat.router)

app.include_router(api)
