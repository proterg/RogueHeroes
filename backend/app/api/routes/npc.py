"""
NPC Chat Routes
---------------
Handles AI-powered NPC conversations using Gemini.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.gemini_service import generate_npc_response


router = APIRouter(prefix="/npc", tags=["npc"])


class NpcProfile(BaseModel):
    """NPC character definition."""
    name: str
    backstory: str = ""
    personality: str = ""
    guidelines: str = ""


class ChatMessage(BaseModel):
    """A single message in the conversation."""
    role: str  # "player" or "npc"
    content: str


class ChatRequest(BaseModel):
    """Request to chat with an NPC."""
    npc: NpcProfile
    conversation_history: list[ChatMessage] = []
    player_message: str
    system_prompt: str | None = None  # Pre-built prompt (overrides npc fields)


class ChatResponse(BaseModel):
    """NPC's response."""
    npc_response: str


@router.post("/chat", response_model=ChatResponse)
async def chat_with_npc(request: ChatRequest) -> ChatResponse:
    """
    Send a message to an AI NPC and get their response.

    The NPC will respond based on their backstory, personality,
    and conversation guidelines while staying in character.
    """
    response = await generate_npc_response(
        npc_name=request.npc.name,
        backstory=request.npc.backstory,
        personality=request.npc.personality,
        guidelines=request.npc.guidelines,
        conversation_history=[msg.model_dump() for msg in request.conversation_history],
        player_message=request.player_message,
        system_prompt=request.system_prompt,
    )

    return ChatResponse(npc_response=response)
