import React, { useState, useCallback } from 'react';

export const Instructions = React.memo(() => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleInstructions = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className="instructions">
      <button
        className="w-full flex items-center justify-between p-3 bg-emerald-700/50 hover:bg-emerald-700/70 rounded-lg transition-colors duration-200"
        onClick={toggleInstructions}
        aria-expanded={isExpanded}
        aria-controls="instructions-content"
      >
        <span className="text-lg font-semibold text-emerald-100">
          How to Play Paper Soccer
        </span>
        <span className={`text-emerald-200 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      
      {isExpanded && (
        <div 
          id="instructions-content"
          className="mt-4 p-4 bg-emerald-800/30 rounded-lg text-emerald-100 space-y-3"
        >
          <div className="space-y-2">
            <h3 className="font-semibold text-emerald-200">Objective:</h3>
            <p className="text-sm leading-relaxed">
              Score a goal by moving the ball into your opponent's goal area. 
              Player 1 aims for the top goal, Player 2 aims for the bottom goal.
            </p>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-emerald-200">How to Move:</h3>
            <ul className="text-sm space-y-1 list-disc list-inside ml-2">
              <li>Click or tap on any highlighted green dot to move the ball</li>
              <li>You can only move to adjacent positions (up, down, left, right, or diagonal)</li>
              <li>You cannot move through existing lines or field boundaries</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-emerald-200">Special Rules:</h3>
            <ul className="text-sm space-y-1 list-disc list-inside ml-2">
              <li>If you hit a boundary or existing line, you get an extra turn</li>
              <li>If you cannot make any valid moves, you lose</li>
              <li>The game ends when someone scores or gets blocked</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-emerald-200">Controls:</h3>
            <ul className="text-sm space-y-1 list-disc list-inside ml-2">
              <li><strong>Click/Tap:</strong> Make a move</li>
              <li><strong>Undo Button or Space:</strong> Undo last move</li>
              <li><strong>New Game Button or R:</strong> Start over</li>
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-emerald-900/50 rounded border-l-4 border-emerald-400">
            <p className="text-xs text-emerald-200">
              <strong>Tip:</strong> Plan your moves carefully! Each line you draw stays on the field 
              and affects future moves for both players.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});