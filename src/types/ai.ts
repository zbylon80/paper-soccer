import type { GameState, GameConfig, Pos } from '../../packages/core/src/types';

// AI difficulty levels
export type AIDifficulty = 'easy' | 'medium' | 'hard';

// Game modes
export type GameMode = 'human-vs-human' | 'human-vs-ai';

// AI configuration for strategy tuning
export interface AIConfig {
  difficulty: AIDifficulty;
  responseTimeMs: number;
  randomnessFactor: number; // 0-1, higher = more random moves
  goalSeekingWeight: number; // Priority for moves toward goal
  selfPreservationWeight: number; // Priority for avoiding blocks
}

// AI Player interface
export interface AIPlayer {
  analyzeMove(gameState: GameState, config: GameConfig): Promise<Pos | null>;
  getDifficulty(): AIDifficulty;
  setDifficulty(level: AIDifficulty): void;
}

// Game mode state for managing AI vs Human gameplay
export interface GameModeState {
  mode: GameMode;
  aiPlayer: AIPlayer | null;
  isAiTurn: boolean;
  aiThinking: boolean;
}

// Extended game display state that includes AI information
export interface GameDisplayState {
  currentPlayer: 'Player 1' | 'Player 2' | 'AI';
  gameStatus: 'playing' | 'player1_wins' | 'player2_wins' | 'ai_wins' | 'blocked';
  canUndo: boolean;
  validMoves: Pos[];
  ballPosition: Pos;
  gameMode: GameMode;
  isAiTurn: boolean;
  aiThinking: boolean;
}