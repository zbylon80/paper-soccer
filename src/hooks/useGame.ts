import { useState, useCallback } from 'react';
import { GameEngine, DEFAULT_CONFIG, type GameState, type GameConfig, type Pos } from '@paper-soccer/core';

export interface UseGameReturn {
  gameState: GameState;
  makeMove: (to: Pos) => boolean;
  undo: () => boolean;
  reset: () => void;
  canUndo: boolean;
}

export function useGame(config: GameConfig = DEFAULT_CONFIG): UseGameReturn {
  const [engine] = useState(() => new GameEngine(config));
  const [gameState, setGameState] = useState(() => engine.getState());

  const makeMove = useCallback((to: Pos): boolean => {
    console.log('useGame: makeMove called with:', to);
    const currentState = engine.getState();
    console.log('useGame: current gameState.edges before:', currentState.edges);
    const success = engine.makeMove(to);
    console.log('useGame: makeMove success:', success);
    if (success) {
      const newState = engine.getState();
      console.log('useGame: new gameState.edges after:', newState.edges);
      setGameState(newState);
    }
    return success;
  }, [engine]);

  const undo = useCallback((): boolean => {
    const success = engine.undo();
    if (success) {
      setGameState(engine.getState());
    }
    return success;
  }, [engine]);

  const reset = useCallback((): void => {
    engine.reset();
    setGameState(engine.getState());
  }, [engine]);

  const canUndo = engine.getHistory().length > 0;

  return {
    gameState,
    makeMove,
    undo,
    reset,
    canUndo
  };
}