import './index.css';
import './styles/game.css';
import { DEFAULT_CONFIG } from '@paper-soccer/core';
import type { Pos } from '@paper-soccer/core';
import { GameBoard } from './components/GameBoard';
import { PlayerIndicator } from './components/PlayerIndicator';
import { useGame } from './hooks/useGame';

export default function App() {
  const { gameState, makeMove } = useGame(DEFAULT_CONFIG);
  
  const handleMove = (to: Pos) => {
    makeMove(to);
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
          <PlayerIndicator gameState={gameState} />
        </div>
      </div>
    </div>
  );
}
