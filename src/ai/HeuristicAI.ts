import type { GameState, GameConfig, Pos } from '../../packages/core/src/types';
import type { AIPlayer, AIDifficulty, AIConfig } from '../types/ai';

/**
 * HeuristicAI implements an intelligent Paper Soccer AI using heuristic strategy.
 * 
 * Strategy priorities:
 * 1. Advance toward opponent's goal
 * 2. Avoid moves that immediately block self
 * 3. Look for bounce opportunities (extra turns)
 * 4. Add randomness based on difficulty level
 */
export class HeuristicAI implements AIPlayer {
  private difficulty: AIDifficulty = 'medium';

  constructor(difficulty: AIDifficulty = 'medium') {
    this.difficulty = difficulty;
  }

  getDifficulty(): AIDifficulty {
    return this.difficulty;
  }

  setDifficulty(level: AIDifficulty): void {
    this.difficulty = level;
  }

  /**
   * Analyzes the current game state and returns the best move for the AI.
   * Uses heuristic evaluation with difficulty-based randomness.
   */
  async analyzeMove(gameState: GameState, config: GameConfig): Promise<Pos | null> {
    // Return null if no valid moves available
    if (!gameState.validMoves || gameState.validMoves.length === 0) {
      return null;
    }

    // Get AI configuration based on difficulty
    const aiConfig = this.getAIConfig();

    // Add artificial delay to simulate thinking time
    await this.simulateThinkingTime(aiConfig.responseTimeMs);

    // Evaluate all valid moves and select the best one
    const bestMove = this.selectBestMove(gameState, config, aiConfig);
    
    return bestMove;
  }

  /**
   * Selects the best move using heuristic evaluation
   */
  private selectBestMove(gameState: GameState, config: GameConfig, aiConfig: AIConfig): Pos {
    const validMoves = gameState.validMoves;
    
    // If only one move available, return it
    if (validMoves.length === 1) {
      return validMoves[0];
    }

    // Evaluate each move and calculate scores
    const moveScores = validMoves.map(move => ({
      move,
      score: this.evaluateMove(move, gameState, config, aiConfig)
    }));

    // Apply randomness based on difficulty
    const adjustedScores = this.applyRandomness(moveScores, aiConfig.randomnessFactor);

    // Find the move with the highest score
    const bestMoveData = adjustedScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return bestMoveData.move;
  }

  /**
   * Evaluates a single move using multiple heuristic factors
   */
  private evaluateMove(move: Pos, gameState: GameState, config: GameConfig, aiConfig: AIConfig): number {
    let score = 0;

    // Factor 1: Goal-seeking behavior (prioritize moves toward opponent's goal)
    score += this.evaluateGoalDistance(move, gameState, config) * aiConfig.goalSeekingWeight;

    // Factor 2: Self-preservation (avoid moves that block the AI)
    score += this.evaluateSelfPreservation(move, gameState, config) * aiConfig.selfPreservationWeight;

    // Factor 3: Bounce opportunities (moves that grant extra turns)
    score += this.evaluateBounceOpportunity(move, gameState, config);

    return score;
  }

  /**
   * Evaluates how well a move advances toward the opponent's goal
   */
  private evaluateGoalDistance(move: Pos, gameState: GameState, config: GameConfig): number {
    // Determine which goal the AI should target based on current player
    const aiPlayer = gameState.current;
    const targetGoalX = aiPlayer === 0 ? config.width : 0; // Player 0 targets right goal, Player 1 targets left goal

    // Calculate distance from move to target goal
    const currentDistance = Math.abs(gameState.pos.x - targetGoalX);
    const newDistance = Math.abs(move.x - targetGoalX);

    // Positive score for moves that get closer to goal
    return currentDistance - newDistance;
  }

  /**
   * Evaluates whether a move would block the AI's future options
   */
  private evaluateSelfPreservation(move: Pos, _gameState: GameState, config: GameConfig): number {
    // This is a simplified heuristic - in a full implementation, we would
    // simulate the move and check how many valid moves remain
    
    // For now, prefer moves toward the center of the field
    const centerY = config.height / 2;
    const distanceFromCenter = Math.abs(move.y - centerY);
    
    // Prefer moves closer to center (more options available)
    return -distanceFromCenter;
  }

  /**
   * Evaluates whether a move might lead to a bounce (extra turn)
   */
  private evaluateBounceOpportunity(move: Pos, _gameState: GameState, config: GameConfig): number {
    // Simplified heuristic: moves near edges or corners might lead to bounces
    const edgeBonus = (move.x === 0 || move.x === config.width || move.y === 0 || move.y === config.height) ? 2 : 0;
    return edgeBonus;
  }

  /**
   * Applies randomness to move scores based on difficulty level
   */
  private applyRandomness(moveScores: Array<{move: Pos, score: number}>, randomnessFactor: number): Array<{move: Pos, score: number}> {
    return moveScores.map(moveData => ({
      ...moveData,
      score: moveData.score + (Math.random() - 0.5) * randomnessFactor * 10
    }));
  }

  /**
   * Gets AI configuration based on current difficulty level
   */
  private getAIConfig(): AIConfig {
    switch (this.difficulty) {
      case 'easy':
        return {
          difficulty: 'easy',
          responseTimeMs: 500,
          randomnessFactor: 0.8, // High randomness
          goalSeekingWeight: 1.0,
          selfPreservationWeight: 0.5
        };
      case 'medium':
        return {
          difficulty: 'medium',
          responseTimeMs: 1000,
          randomnessFactor: 0.4, // Moderate randomness
          goalSeekingWeight: 2.0,
          selfPreservationWeight: 1.0
        };
      case 'hard':
        return {
          difficulty: 'hard',
          responseTimeMs: 1500,
          randomnessFactor: 0.1, // Low randomness
          goalSeekingWeight: 3.0,
          selfPreservationWeight: 2.0
        };
    }
  }

  /**
   * Simulates AI thinking time with a delay
   */
  private async simulateThinkingTime(delayMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }
}