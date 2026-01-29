/**
 * NpcCharacterInteraction Component
 * ----------------------------------
 * Handles conversations with AI-powered NPCs using full character sheets.
 * Uses the NpcCharacter type for rich personality-driven conversations
 * powered by Gemini with detailed system prompts.
 */

import React, { useState, useRef, useEffect } from 'react';
import { NpcCharacter } from '../../../types/npcCharacter';
import { ChatMessage } from '../../../types/aiNpc';
import { chatWithNpcCharacter } from '../../../api/npc';

interface NpcCharacterInteractionProps {
  npc: NpcCharacter;
  greeting?: string;
  onClose: () => void;
  onKickOut?: () => void;
  onReward?: (reward: { type: string; name: string; description: string; artifactId?: string }) => void;
}

// Phrases that indicate the player is being kicked out
const KICK_OUT_PHRASES = [
  'get out',
  'leave now',
  'banned',
  'not welcome',
  'never come back',
  'throws you out',
  'kicks you out',
  'escorts you out',
  'points to the door',
  'points at the door',
  'out of my tavern',
  'out of here',
  'don\'t come back',
  'never return',
  'you\'re done here',
  'we\'re done',
];

// BJJ-related keywords that indicate player knows jiu jitsu
const BJJ_KEYWORDS = [
  'jiu jitsu',
  'jiu-jitsu',
  'jiujitsu',
  'bjj',
  'grappling',
  'submission',
  'guard',
  'mount',
  'armbar',
  'arm bar',
  'triangle',
  'rear naked',
  'oss',
  'rolling',
  'tap',
  'tapping',
  'choke',
  'kimura',
  'omoplata',
  'sweep',
  'pass',
  'half guard',
  'full guard',
  'closed guard',
  'open guard',
  'side control',
  'back control',
  'gi',
  'no-gi',
  'nogi',
];

export const NpcCharacterInteraction: React.FC<NpcCharacterInteractionProps> = ({
  npc,
  greeting,
  onClose,
  onKickOut,
  onReward,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Start with greeting if provided
    if (greeting) {
      return [{ role: 'npc', content: greeting }];
    }
    return [];
  });
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isKickedOut, setIsKickedOut] = useState(false);
  const [bjjUnlocked, setBjjUnlocked] = useState(false);
  const [showingReward, setShowingReward] = useState(false);
  const [rewardGiven, setRewardGiven] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const npcName = npc.background.name;

  // Check if response contains kick-out phrases
  const checkForKickOut = (response: string): boolean => {
    const lowerResponse = response.toLowerCase();
    return KICK_OUT_PHRASES.some(phrase => lowerResponse.includes(phrase));
  };

  // Check if player message contains BJJ knowledge
  const checkForBjjKnowledge = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return BJJ_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
  };

  // Handle close button - intercept for Seraphina's reward
  const handleClose = () => {
    // If this is Seraphina and BJJ was unlocked but reward not given yet
    if (npc.id === 'seraphina_fighter' && bjjUnlocked && !rewardGiven) {
      setShowingReward(true);
      return;
    }
    onClose();
  };

  // Handle accepting the reward
  const handleAcceptReward = () => {
    setRewardGiven(true);
    onReward?.({
      type: 'book',
      name: 'The Art of the Ground',
      description: '+1 Tactics, +1 Deployments',
      artifactId: 'art_of_the_ground',
    });
    // Add her thank you message
    setMessages(prev => [...prev, {
      role: 'npc',
      content: '*a rare smile crosses her face* It\'s been a long time since I could talk to someone about this. Here... take this. *hands you a worn leather book* It\'s everything I know about fighting. Use it well.',
    }]);
    setShowingReward(false);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    // Check if player mentioned BJJ (for Seraphina)
    if (npc.id === 'seraphina_fighter' && !bjjUnlocked && checkForBjjKnowledge(message)) {
      setBjjUnlocked(true);
    }

    // Add player message
    const playerMessage: ChatMessage = { role: 'player', content: message };
    setMessages((prev) => [...prev, playerMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get NPC response using full character sheet
      const response = await chatWithNpcCharacter(npc, messages, message);

      // Add NPC response
      const npcMessage: ChatMessage = { role: 'npc', content: response };
      setMessages((prev) => [...prev, npcMessage]);

      // Check if player is being kicked out (only Marta can kick out)
      if (npc.id === 'marta_tavern_keeper' && checkForKickOut(response)) {
        setIsKickedOut(true);
        // Auto-close after 5 seconds and trigger ban
        setTimeout(() => {
          onKickOut?.();
          onClose();
        }, 5000);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'npc', content: `*${npcName} looks confused*` },
      ]);
    } finally {
      setIsLoading(false);
      // Re-focus input after response (small delay for DOM update)
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get a brief description from the NPC's background
  const npcTitle = npc.background.occupation || npc.background.role;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: '#e0e0e0',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #3a3a5a',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#252540',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
            {npcName}
          </h2>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {npcTitle}
          </span>
        </div>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          &times;
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: '#666',
              fontStyle: 'italic',
              marginTop: '20px',
            }}
          >
            Start a conversation with {npcName}...
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'player' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '10px 14px',
                borderRadius: msg.role === 'player' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: msg.role === 'player' ? '#4a5568' : '#2d3748',
                border: msg.role === 'player' ? '1px solid #5a6578' : '1px solid #3d4758',
              }}
            >
              {msg.role === 'npc' && (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#a0aec0',
                    marginBottom: '4px',
                    fontWeight: 'bold',
                  }}
                >
                  {npcName}
                </div>
              )}
              <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '16px 16px 16px 4px',
                backgroundColor: '#2d3748',
                border: '1px solid #3d4758',
                color: '#888',
                fontStyle: 'italic',
              }}
            >
              {npcName} is thinking...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #3a3a5a',
          backgroundColor: '#252540',
          display: 'flex',
          gap: '8px',
        }}
      >
        {isKickedOut ? (
          <div
            style={{
              flex: 1,
              padding: '10px 14px',
              color: '#ff6b6b',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
          >
            You have been kicked out. The tavern door will close in a moment...
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Say something to ${npcName}...`}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #3a3a5a',
                backgroundColor: '#1a1a2e',
                color: '#e0e0e0',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isLoading || !inputValue.trim() ? '#3a3a5a' : '#4a7c59',
                color: '#fff',
                fontSize: '14px',
                cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              Send
            </button>
          </>
        )}
      </div>

      {/* Seraphina's reward modal - she stops you before you leave */}
      {showingReward && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 10,
          }}
        >
          <div
            style={{
              backgroundColor: '#1a1a2e',
              border: '2px solid #4a7c59',
              borderRadius: 8,
              padding: 24,
              maxWidth: 400,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16, marginBottom: 16, color: '#e0e0e0' }}>
              *{npcName} grabs your arm as you turn to leave*
            </div>
            <div style={{ fontSize: 14, marginBottom: 20, color: '#a0aec0', fontStyle: 'italic' }}>
              "Wait. You... you actually know what I'm talking about. It's been years since anyone..."
              <br /><br />
              *she pauses, her tough exterior cracking*
              <br /><br />
              "Here. Take this."
            </div>
            <div
              style={{
                backgroundColor: '#2a2a4e',
                border: '1px solid #4a7c59',
                borderRadius: 4,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ color: '#4a7c59', fontWeight: 'bold', marginBottom: 4 }}>
                📖 The Art of the Ground
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>
                +1 Tactics, +1 Deployments
              </div>
            </div>
            <button
              onClick={handleAcceptReward}
              style={{
                padding: '10px 24px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: '#4a7c59',
                color: '#fff',
                fontSize: 14,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
