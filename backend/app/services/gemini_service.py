"""
Claude AI Service
------------------
Handles NPC conversation generation using Anthropic's Claude API.
"""

import httpx
from app.config import settings


CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"


async def generate_npc_response(
    npc_name: str,
    backstory: str,
    personality: str,
    guidelines: str,
    conversation_history: list[dict],
    player_message: str,
    system_prompt: str | None = None,
) -> str:
    """
    Generate an NPC response using Claude.

    Args:
        npc_name: The NPC's name
        backstory: NPC background and history (used if system_prompt not provided)
        personality: How the NPC behaves and speaks (used if system_prompt not provided)
        guidelines: What the NPC should/shouldn't reveal (used if system_prompt not provided)
        conversation_history: Previous messages [{role: "player"|"npc", content: str}]
        player_message: The player's current message
        system_prompt: Optional pre-built system prompt (overrides backstory/personality/guidelines)

    Returns:
        The NPC's response text
    """
    if not settings.anthropic_api_key:
        return f"*{npc_name} stares at you blankly* (Claude API key not configured)"

    # Use provided system prompt or build a simple one
    if system_prompt:
        final_prompt = system_prompt
    else:
        final_prompt = f"""You are roleplaying as an NPC named {npc_name} in a fantasy RPG game.

BACKSTORY:
{backstory}

PERSONALITY:
{personality}

GUIDELINES:
{guidelines}

RULES:
- Stay in character at all times
- Keep responses concise (1-3 sentences typically)
- Use fantasy-appropriate language
- Never break the fourth wall or mention you're an AI
- React naturally to what the player says
- If asked something your character wouldn't know, respond in character"""

    # Build messages array for Claude
    messages = []
    for msg in conversation_history[-10:]:  # Last 10 messages for context
        role = "user" if msg["role"] == "player" else "assistant"
        messages.append({"role": role, "content": msg["content"]})

    # Add current player message
    messages.append({"role": "user", "content": player_message})

    # Call Claude API
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                CLAUDE_API_URL,
                headers={
                    "x-api-key": settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 500,
                    "system": final_prompt,
                    "messages": messages,
                },
                timeout=30.0
            )

            if response.status_code != 200:
                print(f"Claude API error: {response.status_code} - {response.text}")
                return f"*{npc_name} seems distracted* (API error)"

            data = response.json()

            # Extract the response text
            content = data.get("content", [])
            if content and content[0].get("text"):
                return content[0]["text"].strip()

            return f"*{npc_name} mumbles something incoherent*"

    except Exception as e:
        print(f"Claude service error: {e}")
        return f"*{npc_name} seems lost in thought* (Connection error)"
