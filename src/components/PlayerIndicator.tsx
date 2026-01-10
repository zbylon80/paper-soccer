import type { GameState } from '@paper-soccer/core';

interface PlayerIndicatorProps {
  gameState: GameState;
}

export function PlayerIndicator({ gameState }: PlayerIndicatorProps) {
  const { current, winner, blockedLoser, extraTurn } = gameState;
  
  // Determine the display status
  const getGameStatus = () => {
    if (winner !== null) {
      return {
        type: 'winner' as const,
        message: `Player ${winner + 1} Wins!`,
        className: 'text-yellow-300 font-bold'
      };
    }
    
    if (blockedLoser !== null) {
      return {
        type: 'blocked' as const,
        message: `Player ${blockedLoser + 1} is blocked!`,
        className: 'text-red-300 font-bold'
      };
    }
    
    return {
      type: 'playing' as const,
      message: `Player ${current + 1}'s Turn${extraTurn ? ' (Extra Turn)' : ''}`,
      className: 'text-emerald-200'
    };
  };

  const status = getGameStatus();

  return (
    <div className="player-indicator text-center py-4">
      <div className="text-lg font-semibold mb-2">
        <span className={status.className}>
          {status.message}
        </span>
      </div>
      
      {status.type === 'playing' && (
        <div className="flex justify-center items-center space-x-4">
          <div className={`player-badge px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
            current === 0 
              ? 'bg-blue-500 text-white shadow-lg scale-110' 
              : 'bg-gray-600 text-gray-300'
          }`}>
            Player 1
          </div>
          <div className="text-emerald-400 font-bold">VS</div>
          <div className={`player-badge px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
            current === 1 
              ? 'bg-red-500 text-white shadow-lg scale-110' 
              : 'bg-gray-600 text-gray-300'
          }`}>
            Player 2
          </div>
        </div>
      )}
      
      {extraTurn && status.type === 'playing' && (
        <div className="mt-2 text-xs text-yellow-200 animate-pulse">
          Bounced off the edge - same player continues!
        </div>
      )}
    </div>
  );
}