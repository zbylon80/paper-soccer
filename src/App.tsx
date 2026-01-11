import './index.css';
import './styles/game.css';
import { DEFAULT_CONFIG } from '@paper-soccer/core';
import type { Pos } from '@paper-soccer/core';
import { GameBoard } from './components/GameBoard';
import { PlayerIndicator } from './components/PlayerIndicator';
import { GameControls } from './components/GameControls';
import { Instructions } from './components/Instructions';
import { useGame } from './hooks/useGame';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const { gameState, makeMove, undo, reset, canUndo } = useGame(DEFAULT_CONFIG);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: undo,
    onReset: reset,
    canUndo,
    disabled: false
  });
  
  const handleMove = (to: Pos) => {
    makeMove(to);
  };

  return (
    <div className="game-container min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-emerald-50">
      <div className="w-full max-w-7xl">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6">Paper Soccer</h1>
        <div className="text-center text-emerald-200 mb-3 md:mb-4 text-sm md:text-base">
          Simple web-based game - works on desktop and mobile
        </div>
        
        {/* Desktop layout: side by side, Mobile: stacked */}
        <div className="game-layout">
          {/* Game board */}
          <div className="game-board-container">
            <div className="game-board bg-emerald-800/30 rounded-lg p-3 md:p-4 backdrop-blur-sm">
              <GameBoard
                gameState={gameState}
                gameConfig={DEFAULT_CONFIG}
                onMove={handleMove}
              />
            </div>
            
            {/* Controls directly under game board */}
            <div className="game-controls mt-3 md:mt-4">
              <PlayerIndicator gameState={gameState} />
              <GameControls
                onUndo={undo}
                onReset={reset}
                canUndo={canUndo}
                disabled={false}
              />
            </div>
          </div>
          
          {/* Instructions sidebar */}
          <div className="instructions-sidebar">
            <Instructions />
          </div>
        </div>
      </div>
    </div>
  );
}
