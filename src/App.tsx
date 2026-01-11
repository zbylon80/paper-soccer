import { useCallback, useMemo } from 'react';
import './index.css';
import './styles/game.css';
import { DEFAULT_CONFIG } from '@paper-soccer/core';
import type { Pos } from '@paper-soccer/core';
import { GameBoard } from './components/GameBoard';
import { PlayerIndicator } from './components/PlayerIndicator';
import { GameControls } from './components/GameControls';
import { GameModeSelector } from './components/GameModeSelector';
import { Instructions } from './components/Instructions';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeedbackDisplay } from './components/FeedbackDisplay';
import { useGame } from './hooks/useGame';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useFeedback } from './hooks/useFeedback';

export default function App() {
  const { 
    gameState, 
    makeMove, 
    undo, 
    reset, 
    canUndo, 
    gameMode, 
    setGameMode, 
    aiDifficulty, 
    setAIDifficulty, 
    isAiTurn, 
    aiThinking 
  } = useGame(DEFAULT_CONFIG);
  const { messages, removeMessage, showError, showSuccess, showInfo } = useFeedback();
  
  // Memoize handlers to prevent unnecessary re-renders
  const handleMove = useCallback((to: Pos) => {
    console.log('App: handleMove called with:', to);
    try {
      const success = makeMove(to);
      console.log('App: makeMove result:', success);
      if (!success) {
        if (isAiTurn) {
          showError("It's the AI's turn! Please wait.", 2000);
        } else {
          showError("Invalid move! You can only move to highlighted positions.", 2000);
        }
      }
      return success;
    } catch (error) {
      console.error('Error making move:', error);
      showError("Something went wrong with that move. Please try again.", 3000);
      return false;
    }
  }, [makeMove, showError, isAiTurn]);

  const handleUndo = useCallback(() => {
    try {
      const success = undo();
      if (success) {
        showInfo("Move undone", 1500);
      } else {
        if (isAiTurn || aiThinking) {
          showError("Cannot undo during AI turn", 2000);
        } else {
          showError("Nothing to undo", 2000);
        }
      }
      return success;
    } catch (error) {
      console.error('Error undoing move:', error);
      showError("Could not undo move. Please try again.", 3000);
      return false;
    }
  }, [undo, showError, showInfo, isAiTurn, aiThinking]);

  const handleReset = useCallback(() => {
    try {
      reset();
      showSuccess("New game started!", 2000);
    } catch (error) {
      console.error('Error resetting game:', error);
      showError("Could not start new game. Please refresh the page.", 3000);
    }
  }, [reset, showSuccess, showError]);

  // Memoize keyboard shortcuts config to prevent unnecessary re-renders
  const keyboardShortcutsConfig = useMemo(() => ({
    onUndo: handleUndo,
    onReset: handleReset,
    canUndo,
    disabled: isAiTurn || aiThinking
  }), [handleUndo, handleReset, canUndo, isAiTurn, aiThinking]);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts(keyboardShortcutsConfig);

  return (
    <ErrorBoundary>
      <div className="game-container min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 text-emerald-50">
        {/* Feedback messages */}
        <FeedbackDisplay messages={messages} onRemove={removeMessage} />
        
        <div className="w-full max-w-7xl mx-auto">
          {/* Header section with title and subtitle */}
          <header className="text-center mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-emerald-50">
              Paper Soccer
            </h1>
            <p className="text-emerald-200 text-sm md:text-base lg:text-lg">
              Simple web-based game - works on desktop and mobile
            </p>
          </header>
          
          {/* Main game layout - responsive design */}
          <main className="game-layout">
            {/* Game mode selector */}
            <section className="game-mode-section" aria-label="Game mode selection">
              <GameModeSelector
                gameMode={gameMode}
                aiDifficulty={aiDifficulty}
                onGameModeChange={setGameMode}
                onAIDifficultyChange={setAIDifficulty}
                disabled={aiThinking}
              />
            </section>
            
            {/* Instructions section - appears first on mobile, above game on desktop */}
            <section className="instructions-sidebar" aria-label="Game instructions">
              <Instructions />
            </section>
            
            {/* Game section */}
            <section className="game-board-container" aria-label="Game board and controls">
              {/* Player status indicator */}
              <div className="mb-3 md:mb-4">
                <PlayerIndicator 
                  gameState={gameState} 
                  gameMode={gameMode}
                  isAiTurn={isAiTurn}
                  aiThinking={aiThinking}
                />
              </div>
              
              {/* Game board */}
              <div className="game-board bg-emerald-800/30 rounded-lg p-3 md:p-4 backdrop-blur-sm shadow-lg">
                <GameBoard
                  gameState={gameState}
                  gameConfig={DEFAULT_CONFIG}
                  onMove={handleMove}
                  disabled={isAiTurn || aiThinking}
                  gameMode={gameMode}
                />
              </div>
              
              {/* Game controls */}
              <div className="mt-3 md:mt-4">
                <GameControls
                  onUndo={handleUndo}
                  onReset={handleReset}
                  canUndo={canUndo}
                  disabled={isAiTurn || aiThinking}
                />
              </div>
            </section>
          </main>
          
          {/* Footer with accessibility info */}
          <footer className="text-center mt-6 text-emerald-300 text-xs opacity-75">
            <p>Use keyboard shortcuts: Space (undo) • R (new game)</p>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}
