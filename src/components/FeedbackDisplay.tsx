import React, { useCallback } from 'react';
import type { FeedbackMessage } from '../hooks/useFeedback';

interface FeedbackDisplayProps {
  messages: FeedbackMessage[];
  onRemove: (id: string) => void;
}

export const FeedbackDisplay = React.memo<FeedbackDisplayProps>(({ messages, onRemove }) => {
  const handleRemove = useCallback((id: string) => {
    onRemove(id);
  }, [onRemove]);

  if (messages.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2 pointer-events-none">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`
            pointer-events-auto px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm
            transition-all duration-300 ease-in-out transform
            animate-in slide-in-from-top-2 fade-in
            ${message.type === 'error' 
              ? 'bg-red-900/90 text-red-100 border border-red-700/50' 
              : message.type === 'success'
              ? 'bg-green-900/90 text-green-100 border border-green-700/50'
              : 'bg-blue-900/90 text-blue-100 border border-blue-700/50'
            }
          `}
          style={{ touchAction: 'manipulation' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {message.type === 'error' ? '❌' : message.type === 'success' ? '✅' : 'ℹ️'}
              </span>
              <span className="text-sm font-medium">{message.message}</span>
            </div>
            <button
              onClick={() => handleRemove(message.id)}
              className="text-current opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss message"
              style={{ touchAction: 'manipulation' }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
});