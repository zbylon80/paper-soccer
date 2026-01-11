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

    // Factor 4: Opponent blocking potential (harder difficulties only)
    if (aiConfig.difficulty !== 'easy') {
      score += this.evaluateOpponentBlocking(move, gameState, config);
    }

    return score;
  }

  /**
   * Evaluates how well a move advances toward the opponent's goal
   * Uses Manhattan distance with goal zone weighting
   */
  private evaluateGoalDistance(move: Pos, gameState: GameState, config: GameConfig): number {
    const aiPlayer = gameState.current;
    // CORRECT LOGIC: 
    // - Player 0 (human) has goal at x=0 (bottom, blue) - AI should attack this
    // - Player 1 (AI) has goal at x=width (top, red) - human should attack this
    // - AI is Player 1, so AI should target Player 0's goal at x=0
    const targetGoalX = aiPlayer === 1 ? 0 : config.width; // AI (Player 1) targets Player 0's goal (x=0, bottom)
    
    // Calculate goal zone Y coordinates
    const goalYRange = this.getGoalYRange(config.height, config.goalWidth);
    const goalCenterY = Math.floor(config.height / 2);

    // Current position distances
    const currentDistanceX = Math.abs(gameState.pos.x - targetGoalX);
    const currentDistanceY = Math.min(...goalYRange.map(y => Math.abs(gameState.pos.y - y)));
    const currentTotalDistance = currentDistanceX + currentDistanceY;

    // New position distances
    const newDistanceX = Math.abs(move.x - targetGoalX);
    const newDistanceY = Math.min(...goalYRange.map(y => Math.abs(move.y - y)));
    const newTotalDistance = newDistanceX + newDistanceY;

    // Base score for getting closer to goal
    let score = currentTotalDistance - newTotalDistance;

    // Bonus for moves that align with goal zone
    if (goalYRange.includes(move.y)) {
      score += 2; // Extra bonus for being in goal zone Y range
    }

    // Extra bonus for moves directly toward goal center
    if (Math.abs(move.y - goalCenterY) < Math.abs(gameState.pos.y - goalCenterY)) {
      score += 1;
    }

    // Penalty for moves away from goal
    if (newDistanceX > currentDistanceX) {
      score -= 1;
    }

    return score;
  }

  /**
   * Evaluates whether a move would block the AI's future options
   * Uses sophisticated analysis of remaining move options
   */
  private evaluateSelfPreservation(move: Pos, gameState: GameState, config: GameConfig): number {
    let score = 0;

    // Simulate the move to see how many options remain
    const simulatedEdges = new Set(gameState.edges);
    const edgeKey = this.keyEdge(gameState.pos, move);
    simulatedEdges.add(edgeKey);

    // Count valid moves from the new position
    const futureValidMoves = this.computeValidMovesFromPosition(move, simulatedEdges, config);
    
    // Prefer moves that leave more options
    score += futureValidMoves.length * 0.5;

    // Penalty for moves that lead to corners or dead ends
    if (this.isCornerPosition(move, config)) {
      score -= 2;
    }

    // Penalty for moves that get too close to edges without bouncing
    if (this.isNearEdgeWithoutBounce(move, simulatedEdges, config)) {
      score -= 1;
    }

    // Bonus for moves toward center of field (more options)
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    const distanceFromCenter = Math.sqrt(Math.pow(move.x - centerX, 2) + Math.pow(move.y - centerY, 2));
    const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
    score += (1 - distanceFromCenter / maxDistance) * 1.5;

    return score;
  }

  /**
   * Evaluates whether a move might lead to a bounce (extra turn)
   * Uses the same logic as the game engine to detect bounces
   */
  private evaluateBounceOpportunity(move: Pos, gameState: GameState, config: GameConfig): number {
    // Check if this move would result in a bounce using game engine logic
    const willBounce = this.willMoveBounce(move, gameState.edges, config);
    
    if (willBounce) {
      // High bonus for bounce opportunities - extra turns are very valuable
      return 5;
    }

    // Small bonus for moves that might set up future bounces
    // Check if the move gets us closer to boundary or existing edges
    let setupScore = 0;

    // Bonus for moves toward boundaries (potential future bounces)
    if (this.isBoundary(move, config)) {
      setupScore += 1;
    }

    // Bonus for moves near existing edges (potential future bounces)
    const nearExistingEdge = this.isNearExistingEdges(move, gameState.edges, config);
    if (nearExistingEdge) {
      setupScore += 0.5;
    }

    return setupScore;
  }

  /**
   * Applies randomness to move scores based on difficulty level
   * Uses different randomness strategies for different difficulty levels
   */
  private applyRandomness(moveScores: Array<{move: Pos, score: number}>, randomnessFactor: number): Array<{move: Pos, score: number}> {
    if (randomnessFactor <= 0) return moveScores;

    return moveScores.map(moveData => {
      // Apply proportional randomness - higher scores get less randomness
      const maxScore = Math.max(...moveScores.map(m => m.score));
      const minScore = Math.min(...moveScores.map(m => m.score));
      const scoreRange = maxScore - minScore || 1;
      
      // Normalize score to 0-1 range
      const normalizedScore = (moveData.score - minScore) / scoreRange;
      
      // Apply less randomness to better moves (for more realistic AI behavior)
      const adjustedRandomness = randomnessFactor * (1 - normalizedScore * 0.5);
      
      // Generate random adjustment
      const randomAdjustment = (Math.random() - 0.5) * adjustedRandomness * 8;
      
      return {
        ...moveData,
        score: moveData.score + randomAdjustment
      };
    });
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
          randomnessFactor: 1.2, // High randomness - makes more mistakes
          goalSeekingWeight: 1.0, // Basic goal seeking
          selfPreservationWeight: 0.3 // Low self-preservation - makes risky moves
        };
      case 'medium':
        return {
          difficulty: 'medium',
          responseTimeMs: 1000,
          randomnessFactor: 0.6, // Moderate randomness - some mistakes
          goalSeekingWeight: 2.0, // Good goal seeking
          selfPreservationWeight: 1.2 // Balanced self-preservation
        };
      case 'hard':
        return {
          difficulty: 'hard',
          responseTimeMs: 1500,
          randomnessFactor: 0.2, // Low randomness - very strategic
          goalSeekingWeight: 2.5, // Strong goal seeking
          selfPreservationWeight: 2.0 // High self-preservation - avoids traps
        };
    }
  }

  /**
   * Simulates AI thinking time with a delay
   */
  private async simulateThinkingTime(delayMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // ======= Helper Methods for Enhanced Heuristics =======

  /**
   * Gets the goal Y range for the given configuration
   */
  private getGoalYRange(height: number, goalWidth: number): number[] {
    const mid = Math.floor(height / 2);
    const a = Math.max(1, mid - Math.floor(goalWidth / 2) + (goalWidth % 2 === 0 ? 0 : 1));
    const b = Math.min(height - 1, mid + Math.ceil(goalWidth / 2));
    const arr: number[] = [];
    for (let y = a; y <= b; y++) arr.push(y);
    return arr;
  }

  /**
   * Creates an edge key for two positions (same logic as game engine)
   */
  private keyEdge(a: Pos, b: Pos): string {
    const k1 = `${a.x},${a.y}`;
    const k2 = `${b.x},${b.y}`;
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
  }

  /**
   * Computes valid moves from a given position (simplified version of game engine logic)
   */
  private computeValidMovesFromPosition(pos: Pos, edges: Set<string>, config: GameConfig): Pos[] {
    const candidates: Pos[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const q = { x: pos.x + dx, y: pos.y + dy };
        if (!this.inBounds(q, config)) continue;
        if (this.isBorderEdge(pos, q, config)) continue;
        const k = this.keyEdge(pos, q);
        if (edges.has(k)) continue;
        candidates.push(q);
      }
    }
    return candidates;
  }

  /**
   * Checks if position is within bounds
   */
  private inBounds(p: Pos, config: GameConfig): boolean {
    return p.x >= 0 && p.x <= config.width && p.y >= 0 && p.y <= config.height;
  }

  /**
   * Checks if edge is along the border (forbidden)
   */
  private isBorderEdge(a: Pos, b: Pos, config: GameConfig): boolean {
    if (a.y === 0 && b.y === 0) return true; // top edge
    if (a.y === config.height && b.y === config.height) return true; // bottom edge
    if (a.x === 0 && b.x === 0) return true; // left edge
    if (a.x === config.width && b.x === config.width) return true; // right edge
    return false;
  }

  /**
   * Checks if position is a corner
   */
  private isCornerPosition(p: Pos, config: GameConfig): boolean {
    return (p.x === 0 || p.x === config.width) && (p.y === 0 || p.y === config.height);
  }

  /**
   * Checks if position is near edge without bouncing opportunity
   */
  private isNearEdgeWithoutBounce(p: Pos, edges: Set<string>, config: GameConfig): boolean {
    const nearEdge = p.x <= 1 || p.x >= config.width - 1 || p.y <= 1 || p.y >= config.height - 1;
    const wouldBounce = this.willMoveBounce(p, edges, config);
    return nearEdge && !wouldBounce;
  }

  /**
   * Checks if position is on boundary
   */
  private isBoundary(p: Pos, config: GameConfig): boolean {
    return p.x === 0 || p.x === config.width || p.y === 0 || p.y === config.height;
  }

  /**
   * Checks if position is near existing edges
   */
  private isNearExistingEdges(p: Pos, edges: Set<string>, config: GameConfig): boolean {
    const dirs = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },                     { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 },
    ];
    
    for (const d of dirs) {
      const q = { x: p.x + d.dx, y: p.y + d.dy };
      if (!this.inBounds(q, config)) continue;
      if (edges.has(this.keyEdge(p, q))) return true;
    }
    return false;
  }

  /**
   * Determines if a move would result in a bounce (same logic as game engine)
   */
  private willMoveBounce(target: Pos, edges: Set<string>, config: GameConfig): boolean {
    // Bounce if: target is on boundary OR incident degree >= 1
    if (this.isBoundary(target, config)) return true;
    
    const deg = this.incidentDegree(target, edges, config);
    return deg >= 1;
  }

  /**
   * Calculates incident degree of a position (number of existing edges touching it)
   */
  private incidentDegree(p: Pos, edges: Set<string>, config: GameConfig): number {
    let deg = 0;
    const dirs = [
      { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 0 },                     { dx: 1, dy: 0 },
      { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 },
    ];
    
    for (const d of dirs) {
      const q = { x: p.x + d.dx, y: p.y + d.dy };
      if (!this.inBounds(q, config)) continue;
      if (edges.has(this.keyEdge(p, q))) deg++;
    }
    return deg;
  }

  /**
   * Evaluates moves that might limit opponent's future options
   * This is a more advanced heuristic for higher difficulty levels
   */
  private evaluateOpponentBlocking(move: Pos, gameState: GameState, config: GameConfig): number {
    // Simulate making this move
    const simulatedEdges = new Set(gameState.edges);
    simulatedEdges.add(this.keyEdge(gameState.pos, move));

    // Determine opponent's goal
    const opponentPlayer = gameState.current === 0 ? 1 : 0;
    // CORRECT: Player 0 goal is at x=0 (bottom), Player 1 goal is at x=width (top)
    const opponentGoalX = opponentPlayer === 0 ? 0 : config.width;

    let blockingScore = 0;

    // Check if this move creates edges that might limit opponent's path to goal
    const opponentValidMoves = this.computeValidMovesFromPosition(move, simulatedEdges, config);
    
    // Prefer moves that reduce opponent's options toward their goal
    for (const opponentMove of opponentValidMoves) {
      const distanceToOpponentGoal = Math.abs(opponentMove.x - opponentGoalX);
      if (distanceToOpponentGoal > Math.abs(move.x - opponentGoalX)) {
        // This opponent move takes them further from their goal
        blockingScore += 0.3;
      }
    }

    // Small bonus for moves that create "walls" or barriers
    if (this.createsBarrier(move, simulatedEdges, config)) {
      blockingScore += 0.5;
    }

    return blockingScore;
  }

  /**
   * Checks if a move creates a barrier that might limit opponent movement
   */
  private createsBarrier(move: Pos, edges: Set<string>, config: GameConfig): boolean {
    // Check if this position, combined with existing edges, creates a line
    // that spans a significant portion of the field
    const horizontalBarrier = this.checkHorizontalBarrier(move, edges, config);
    const verticalBarrier = this.checkVerticalBarrier(move, edges, config);
    
    return horizontalBarrier || verticalBarrier;
  }

  /**
   * Checks for horizontal barrier formation
   */
  private checkHorizontalBarrier(move: Pos, edges: Set<string>, config: GameConfig): boolean {
    let leftExtent = move.x;
    let rightExtent = move.x;
    
    // Check how far the barrier extends left and right
    for (let x = move.x - 1; x >= 0; x--) {
      if (edges.has(this.keyEdge(move, { x, y: move.y }))) {
        leftExtent = x;
      } else {
        break;
      }
    }
    
    for (let x = move.x + 1; x <= config.width; x++) {
      if (edges.has(this.keyEdge(move, { x, y: move.y }))) {
        rightExtent = x;
      } else {
        break;
      }
    }
    
    // Consider it a barrier if it spans at least 1/3 of the field width
    return (rightExtent - leftExtent) >= config.width / 3;
  }

  /**
   * Checks for vertical barrier formation
   */
  private checkVerticalBarrier(move: Pos, edges: Set<string>, config: GameConfig): boolean {
    let topExtent = move.y;
    let bottomExtent = move.y;
    
    // Check how far the barrier extends up and down
    for (let y = move.y - 1; y >= 0; y--) {
      if (edges.has(this.keyEdge(move, { x: move.x, y }))) {
        topExtent = y;
      } else {
        break;
      }
    }
    
    for (let y = move.y + 1; y <= config.height; y++) {
      if (edges.has(this.keyEdge(move, { x: move.x, y }))) {
        bottomExtent = y;
      } else {
        break;
      }
    }
    
    // Consider it a barrier if it spans at least 1/3 of the field height
    return (bottomExtent - topExtent) >= config.height / 3;
  }
}