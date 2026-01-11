import React, { useCallback } from 'react';

interface GameControlsProps {
  onUndo: () => boolean;
  onReset: () => void;
  canUndo: boolean;
  disabled?: boolean;
}

export const GameControls = React.memo<GameControlsProps>(({ onUndo, onReset, canUndo, disabled }) => {
  const handleUndo = useCallback(() => {
    if (!disabled && canUndo) {
      onUndo();
    }
  }, [disabled, canUndo, onUndo]);

  const handleReset = useCallback(() => {
    if (!disabled) {
      onReset();
    }
  }, [disabled, onReset]);

  return (
    <div className="game-controls" style={{ touchAction: 'manipulation' }}>
      <button
        className={`game-button ${
          canUndo && !disabled
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
        onClick={handleUndo}
        disabled={!canUndo || disabled}
        title="Undo last move (Space)"
        aria-label="Undo last move"
        style={{ touchAction: 'manipulation' }}
        onTouchStart={(e) => e.preventDefault()}
        onTouchEnd={(e) => e.preventDefault()}
      >
        <span className="flex items-center gap-2">
          ↶ Undo
          <span className="hidden sm:inline text-xs opacity-75 bg-black/20 px-1.5 py-0.5 rounded">
            Space
          </span>
        </span>
      </button>
      
      <button
        className={`game-button ${
          !disabled
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
        onClick={handleReset}
        disabled={disabled}
        title="Start new game (R)"
        aria-label="Start new game"
        style={{ touchAction: 'manipulation' }}
        onTouchStart={(e) => e.preventDefault()}
        onTouchEnd={(e) => e.preventDefault()}
      >
        <span className="flex items-center gap-2">
          ⟲ New Game
          <span className="hidden sm:inline text-xs opacity-75 bg-black/20 px-1.5 py-0.5 rounded">
            R
          </span>
        </span>
      </button>
    </div>
  );
});