import React, { useMemo } from 'react';
import type { GameState } from '@paper-soccer/core';
import type { GameMode } from '../types/ai';

interface PlayerIndicatorProps {
  gameState: GameState;
  gameMode?: GameMode;
  isAiTurn?: boolean;
  aiThinking?: boolean;
}

export const PlayerIndicator = React.memo<PlayerIndicatorProps>(({ 
  gameState, 
  gameMode = 'human-vs-human',
  isAiTurn = false,
  aiThinking = false
}) => {
  const { current, winner, blockedLoser, extraTurn } = gameState;
  
  // Determine player names based on game mode
  const getPlayerName = (playerIndex: number): string => {
    if (gameMode === 'human-vs-ai') {
      return playerIndex === 1 ? 'AI' : 'Player';
    }
    return `Player ${playerIndex + 1}`;
  };
  
  // Determine the display status - memoized for performance
  const gameStatus = useMemo(() => {
    if (winner !== null) {
      const winnerName = getPlayerName(winner);
      return {
        type: 'winner' as const,
        message: `${winnerName} Wins!`,
        className: 'text-yellow-300 font-bold'
      };
    }
    
    if (blockedLoser !== null) {
      const blockedPlayerName = getPlayerName(blockedLoser);
      return {
        type: 'blocked' as const,
        message: `${blockedPlayerName} is blocked!`,
        className: 'text-red-300 font-bold'
      };
    }
    
    const currentPlayerName = getPlayerName(current);
    const turnMessage = aiThinking && isAiTurn 
      ? 'AI is thinking...' 
      : `${currentPlayerName}'s Turn${extraTurn ? ' (Extra Turn)' : ''}`;
    
    return {
      type: 'playing' as const,
      message: turnMessage,
      className: aiThinking && isAiTurn ? 'text-purple-300' : 'text-emerald-200'
    };
  }, [current, winner, blockedLoser, extraTurn, gameMode, isAiTurn, aiThinking]);

  return (
    <div className="player-indicator text-center py-4" style={{ touchAction: 'manipulation' }}>
      <div className="text-lg font-semibold mb-2" style={{ touchAction: 'manipulation' }}>
        <span className={gameStatus.className} style={{ touchAction: 'manipulation' }}>
          {gameStatus.message}
        </span>
      </div>
      
      {gameStatus.type === 'playing' && (
        <div className="flex justify-center items-center space-x-4" style={{ touchAction: 'manipulation' }}>
          <div className={`player-badge px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
            current === 0 
              ? 'bg-blue-500 text-white shadow-lg scale-110' 
              : 'bg-gray-600 text-gray-300'
          }`} style={{ touchAction: 'manipulation' }}>
            {getPlayerName(0)}
          </div>
          <div className="text-emerald-400 font-bold" style={{ touchAction: 'manipulation' }}>VS</div>
          <div className={`player-badge px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
            current === 1 
              ? (gameMode === 'human-vs-ai' ? 'bg-purple-500 text-white shadow-lg scale-110' : 'bg-red-500 text-white shadow-lg scale-110')
              : 'bg-gray-600 text-gray-300'
          }`} style={{ touchAction: 'manipulation' }}>
            {getPlayerName(1)}
          </div>
        </div>
      )}
      
      {extraTurn && gameStatus.type === 'playing' && !aiThinking && (
        <div className="mt-2 text-xs text-yellow-200 animate-pulse" style={{ touchAction: 'manipulation' }}>
          Bounced off the edge - same player continues!
        </div>
      )}
      
      {aiThinking && isAiTurn && (
        <div className="mt-2 text-xs text-purple-300 animate-pulse" style={{ touchAction: 'manipulation' }}>
          <span className="inline-block animate-spin mr-1">🤖</span>
          Analyzing the best move...
        </div>
      )}
    </div>
  );
});