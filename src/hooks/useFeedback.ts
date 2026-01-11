import { useState, useCallback } from 'react';

export interface FeedbackMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  message: string;
  duration?: number;
}

export function useFeedback() {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);

  const addMessage = useCallback((message: Omit<FeedbackMessage, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newMessage: FeedbackMessage = {
      ...message,
      id,
      duration: message.duration ?? 3000
    };

    setMessages(prev => [...prev, newMessage]);

    // Auto-remove message after duration
    if (newMessage.duration && newMessage.duration > 0) {
      setTimeout(() => {
        setMessages(prev => prev.filter(msg => msg.id !== id));
      }, newMessage.duration);
    }
  }, []);

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setMessages([]);
  }, []);

  // Convenience methods
  const showError = useCallback((message: string, duration?: number) => {
    addMessage({ type: 'error', message, duration });
  }, [addMessage]);

  const showSuccess = useCallback((message: string, duration?: number) => {
    addMessage({ type: 'success', message, duration });
  }, [addMessage]);

  const showInfo = useCallback((message: string, duration?: number) => {
    addMessage({ type: 'info', message, duration });
  }, [addMessage]);

  return {
    messages,
    addMessage,
    removeMessage,
    clearAll,
    showError,
    showSuccess,
    showInfo
  };
}