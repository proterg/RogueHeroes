/**
 * NPC API Client
 * --------------
 * Functions for interacting with AI-powered NPCs via the backend.
 */

import { AiNpcProfile, ChatMessage } from '../types/aiNpc';
import { NpcCharacter } from '../types/npcCharacter';
import { buildNpcPrompt } from '../game/data/NpcPromptBuilder';

const API_BASE = '/api/npc';

interface ChatResponse {
  npc_response: string;
}

/**
 * Send a message to an AI NPC and get their response (simple version).
 */
export async function chatWithNpc(
  npc: AiNpcProfile,
  conversationHistory: ChatMessage[],
  playerMessage: string
): Promise<string> {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        npc: {
          name: npc.name,
          backstory: npc.backstory,
          personality: npc.personality,
          guidelines: npc.guidelines,
        },
        conversation_history: conversationHistory,
        player_message: playerMessage,
      }),
    });

    if (!response.ok) {
      console.error('NPC chat error:', response.status);
      return `*${npc.name} doesn't respond*`;
    }

    const data: ChatResponse = await response.json();
    return data.npc_response;
  } catch (error) {
    console.error('NPC chat error:', error);
    return `*${npc.name} seems lost in thought*`;
  }
}

/**
 * Send a message to a full NPC character and get their response.
 * Uses the complete character sheet for rich interactions.
 */
export async function chatWithNpcCharacter(
  npc: NpcCharacter,
  conversationHistory: ChatMessage[],
  playerMessage: string
): Promise<string> {
  try {
    // Build the full system prompt from the character sheet
    const systemPrompt = buildNpcPrompt(npc);

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        npc: {
          name: npc.background.name,
        },
        conversation_history: conversationHistory,
        player_message: playerMessage,
        system_prompt: systemPrompt,
      }),
    });

    if (!response.ok) {
      console.error('NPC chat error:', response.status);
      return `*${npc.background.name} doesn't respond*`;
    }

    const data: ChatResponse = await response.json();
    return data.npc_response;
  } catch (error) {
    console.error('NPC chat error:', error);
    return `*${npc.background.name} seems lost in thought*`;
  }
}
