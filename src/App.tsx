import './index.css';
import './styles/game.css';
import { GameEngine, DEFAULT_CONFIG } from '@paper-soccer/core';
import type { Pos } from '@paper-soccer/core';
import { GameBoard } from './components/GameBoard';
import { useState } from 'react';

export default function App() {
  const [gameEngine] = useState(() => new GameEngine(DEFAULT_CONFIG));
  const [gameState, setGameState] = useState(() => gameEngine.getState());
  
  const handleMove = (to: Pos) => {
    const success = gameEngine.makeMove(to);
    if (success) {
      setGameState(gameEngine.getState());
    }
  };

  return (
    <div className="game-container min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-emerald-50">
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold text-center mb-6">Paper Soccer</h1>
        <div className="text-center text-emerald-200 mb-4">
          Simple web-based game - works on desktop and mobile
        </div>
        
        {/* Game board with the new GameBoard component */}
        <div className="game-board bg-emerald-800/30 rounded-lg p-4 backdrop-blur-sm">
          <GameBoard
            gameState={gameState}
            gameConfig={DEFAULT_CONFIG}
            onMove={handleMove}
          />
        </div>
        
        <div className="game-controls mt-4">
          <div className="text-center text-emerald-300">
            Current Player: Player {gameState.current + 1}
            {gameState.winner !== null && (
              <div className="text-yellow-300 font-bold">
                Player {gameState.winner + 1} Wins!
              </div>
            )}
            {gameState.blockedLoser !== null && (
              <div className="text-red-300 font-bold">
                Player {gameState.blockedLoser + 1} is blocked!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
