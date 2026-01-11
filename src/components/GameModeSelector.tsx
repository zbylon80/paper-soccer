import React from 'react';
import type { GameMode, AIDifficulty } from '../types/ai';
import { AIFactory } from '../ai/AIFactory';

interface GameModeSelectorProps {
  gameMode: GameMode;
  aiDifficulty: AIDifficulty;
  onGameModeChange: (mode: GameMode) => void;
  onAIDifficultyChange: (difficulty: AIDifficulty) => void;
  disabled?: boolean;
}

export const GameModeSelector = React.memo<GameModeSelectorProps>(({
  gameMode,
  aiDifficulty,
  onGameModeChange,
  onAIDifficultyChange,
  disabled = false
}) => {
  const availableDifficulties = AIFactory.getAvailableDifficulties();

  return (
    <div className="game-mode-selector bg-emerald-800/20 rounded-lg p-4 mb-4 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-emerald-200 mb-3">Game Mode</h3>
      
      {/* Game Mode Selection */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onGameModeChange('human-vs-human')}
            disabled={disabled}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
              gameMode === 'human-vs-human'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ touchAction: 'manipulation' }}
          >
            👥 Human vs Human
          </button>
          
          <button
            onClick={() => onGameModeChange('human-vs-ai')}
            disabled={disabled}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
              gameMode === 'human-vs-ai'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ touchAction: 'manipulation' }}
          >
            🤖 Human vs AI
          </button>
        </div>

        {/* AI Difficulty Selection - only show when AI mode is selected */}
        {gameMode === 'human-vs-ai' && (
          <div className="mt-4 pt-3 border-t border-emerald-700/30">
            <label className="block text-sm font-medium text-emerald-300 mb-2">
              AI Difficulty
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {availableDifficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => onAIDifficultyChange(difficulty)}
                  disabled={disabled}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    aiDifficulty === difficulty
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ touchAction: 'manipulation' }}
                  title={AIFactory.getDifficultyDescription(difficulty)}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Difficulty description */}
            <p className="text-xs text-emerald-400 mt-2 opacity-75">
              {AIFactory.getDifficultyDescription(aiDifficulty)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});