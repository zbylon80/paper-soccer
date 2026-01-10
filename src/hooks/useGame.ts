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
    const success = engine.makeMove(to);
    if (success) {
      setGameState(engine.getState());
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