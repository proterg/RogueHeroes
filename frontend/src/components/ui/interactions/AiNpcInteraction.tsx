/**
 * AiNpcInteraction Component
 * --------------------------
 * Handles conversations with AI-powered NPCs using Gemini.
 * Shows a chat interface where players can type messages
 * and receive dynamic responses based on NPC personality.
 */

import React, { useState, useRef, useEffect } from 'react';
import { AiNpcProfile, ChatMessage } from '../../../types/aiNpc';
import { chatWithNpc } from '../../../api/npc';

interface AiNpcInteractionProps {
  npc: AiNpcProfile;
  greeting?: string;
  onClose: () => void;
}

export const AiNpcInteraction: React.FC<AiNpcInteractionProps> = ({
  npc,
  greeting,
  onClose,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    // Add player message
    const playerMessage: ChatMessage = { role: 'player', content: message };
    setMessages((prev) => [...prev, playerMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get NPC response
      const response = await chatWithNpc(npc, messages, message);

      // Add NPC response
      const npcMessage: ChatMessage = { role: 'npc', content: response };
      setMessages((prev) => [...prev, npcMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'npc', content: `*${npc.name} looks confused*` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
            {npc.name}
          </h2>
          <span style={{ fontSize: '12px', color: '#888' }}>
            AI Conversation
          </span>
        </div>
        <button
          onClick={onClose}
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
            Start a conversation with {npc.name}...
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
                  {npc.name}
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
              {npc.name} is thinking...
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
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`Say something to ${npc.name}...`}
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
      </div>
    </div>
  );
};
