from typing import Annotated, Union, Any, Literal
from pydantic import BaseModel, Field

class BaseWebhook(BaseModel):
    id: str

class CandidateUpdate(BaseWebhook):
    type: Literal["candidate_update"]
    status: str

class FallbackWebhook(BaseWebhook):
    """Generic fallback for unrecognized webhook types."""
    type: str
    payload: Any

# Left-to-Right Union Mode ensures we attempt strict parsing first, then fallback
# gracefully to the generic payload without throwing HTTP 422
WebhookPayload = Annotated[
    Union[
        Annotated[Union[CandidateUpdate], Field(discriminator="type")],
        FallbackWebhook
    ],
    Field(union_mode="left_to_right")
]
