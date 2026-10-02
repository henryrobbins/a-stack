from typing import Annotated, Any

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import AfterValidator, BaseModel, Field, StringConstraints
from supabase import AsyncClient

from app.clients.anthropic import get_anthropic_client
from app.config import MODELS, settings
from app.deps import get_supabase
from app.services import structured

router = APIRouter()


def _known_model(model: str) -> str:
    if model not in MODELS:
        raise ValueError(f"model must be one of {', '.join(MODELS)}")
    return model


class StructuredIn(BaseModel):
    prompt: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    # `schema` would shadow a BaseModel attribute.
    schema_: dict[str, Any] = Field(alias="schema")
    model: Annotated[str, AfterValidator(_known_model)] = settings.default_model


class StructuredOut(BaseModel):
    id: str
    output: Any
    input_tokens: int
    output_tokens: int
    duration_ms: int


@router.post("/structured")
async def run_structured(
    body: StructuredIn,
    supabase: AsyncClient = Depends(get_supabase),
    client: anthropic.AsyncAnthropic = Depends(get_anthropic_client),
) -> StructuredOut:
    """Generate JSON that satisfies `schema`. A schema the API rejects is a 400."""
    try:
        row = await structured.run(
            supabase, client, body.prompt, body.schema_, body.model
        )
    except structured.SchemaRejectedError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return StructuredOut.model_validate(row)
