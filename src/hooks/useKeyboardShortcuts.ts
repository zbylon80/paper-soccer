import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onUndo: () => boolean;
  onReset: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

export function useKeyboardShortcuts({ onUndo, onReset, canUndo, disabled }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if disabled or if user is typing in an input field
      if (disabled || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ': // Space key for undo
          event.preventDefault(); // Prevent page scroll
          if (canUndo) {
            onUndo();
          }
          break;
        case 'r': // R key for reset
          event.preventDefault();
          onReset();
          break;
        default:
          break;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onUndo, onReset, canUndo, disabled]);
}