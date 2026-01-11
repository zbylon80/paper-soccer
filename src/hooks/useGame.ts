import { useState, useCallback, useEffect } from 'react';
import { GameEngine, DEFAULT_CONFIG, type GameState, type GameConfig, type Pos } from '@paper-soccer/core';
import type { GameMode, AIDifficulty, AIPlayer } from '../types/ai';
import { AIFactory } from '../ai/AIFactory';

export interface UseGameReturn {
  gameState: GameState;
  makeMove: (to: Pos) => boolean;
  undo: () => boolean;
  reset: () => void;
  canUndo: boolean;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  aiDifficulty: AIDifficulty;
  setAIDifficulty: (difficulty: AIDifficulty) => void;
  isAiTurn: boolean;
  aiThinking: boolean;
}

export function useGame(config: GameConfig = DEFAULT_CONFIG): UseGameReturn {
  const [engine] = useState(() => new GameEngine(config));
  const [gameState, setGameState] = useState(() => engine.getState());
  const [gameMode, setGameMode] = useState<GameMode>('human-vs-human');
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>('medium');
  const [aiPlayer, setAiPlayer] = useState<AIPlayer | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  // Initialize AI player when game mode changes to AI
  useEffect(() => {
    if (gameMode === 'human-vs-ai') {
      const ai = AIFactory.createAI(aiDifficulty);
      setAiPlayer(ai);
    } else {
      setAiPlayer(null);
    }
  }, [gameMode, aiDifficulty]);

  // Determine if it's AI's turn (AI is always player 1 in human-vs-ai mode)
  const isAiTurn = gameMode === 'human-vs-ai' && gameState.current === 1 && gameState.winner === null && gameState.blockedLoser === null;

  // Handle AI moves automatically
  useEffect(() => {
    if (isAiTurn && aiPlayer && !aiThinking) {
      setAiThinking(true);
      
      // Make AI move with a slight delay for better UX
      const makeAIMove = async () => {
        try {
          const aiMove = await aiPlayer.analyzeMove(gameState, config);
          if (aiMove && gameState.validMoves.some(move => move.x === aiMove.x && move.y === aiMove.y)) {
            const success = engine.makeMove(aiMove);
            if (success) {
              setGameState(engine.getState());
            }
          }
        } catch (error) {
          console.error('AI move error:', error);
        } finally {
          setAiThinking(false);
        }
      };

      makeAIMove();
    }
  }, [isAiTurn, aiPlayer, aiThinking, gameState, config, engine]);

  const makeMove = useCallback((to: Pos): boolean => {
    console.log('useGame: makeMove called with:', to);
    
    // Prevent moves during AI turn or while AI is thinking
    if (isAiTurn || aiThinking) {
      return false;
    }
    
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
  }, [engine, isAiTurn, aiThinking]);

  const undo = useCallback((): boolean => {
    // Prevent undo during AI turn or while AI is thinking
    if (isAiTurn || aiThinking) {
      return false;
    }
    
    const success = engine.undo();
    if (success) {
      setGameState(engine.getState());
    }
    return success;
  }, [engine, isAiTurn, aiThinking]);

  const reset = useCallback((): void => {
    engine.reset();
    setGameState(engine.getState());
    setAiThinking(false);
  }, [engine]);

  const handleGameModeChange = useCallback((mode: GameMode) => {
    setGameMode(mode);
    // Reset game when changing modes to avoid confusion
    reset();
  }, [reset]);

  const handleAIDifficultyChange = useCallback((difficulty: AIDifficulty) => {
    setAIDifficulty(difficulty);
    // Update existing AI player's difficulty if it exists
    if (aiPlayer) {
      aiPlayer.setDifficulty(difficulty);
    }
  }, [aiPlayer]);

  const canUndo = engine.getHistory().length > 0 && !isAiTurn && !aiThinking;

  return {
    gameState,
    makeMove,
    undo,
    reset,
    canUndo,
    gameMode,
    setGameMode: handleGameModeChange,
    aiDifficulty,
    setAIDifficulty: handleAIDifficultyChange,
    isAiTurn,
    aiThinking
  };
}