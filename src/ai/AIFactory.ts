import { HeuristicAI } from './HeuristicAI';
import type { AIPlayer, AIDifficulty } from '../types/ai';

/**
 * Factory for creating AI players
 */
export class AIFactory {
  /**
   * Creates a new AI player with the specified difficulty
   */
  static createAI(difficulty: AIDifficulty = 'medium'): AIPlayer {
    return new HeuristicAI(difficulty);
  }

  /**
   * Gets available AI difficulty levels
   */
  static getAvailableDifficulties(): AIDifficulty[] {
    return ['easy', 'medium', 'hard'];
  }

  /**
   * Gets a human-readable description for each difficulty level
   */
  static getDifficultyDescription(difficulty: AIDifficulty): string {
    switch (difficulty) {
      case 'easy':
        return 'Easy - Makes more random moves, good for beginners';
      case 'medium':
        return 'Medium - Balanced strategy, good for most players';
      case 'hard':
        return 'Hard - Strategic play with minimal randomness';
    }
  }
}