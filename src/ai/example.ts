/**
 * Example usage of the AI system
 * This file demonstrates how to use the HeuristicAI class
 */

import { HeuristicAI, AIFactory } from './index';
import type { GameState, GameConfig } from '../../packages/core/src/types';

// Example of creating an AI player
export function createExampleAI() {
  // Method 1: Direct instantiation
  const ai1 = new HeuristicAI('medium');
  
  // Method 2: Using factory
  const ai2 = AIFactory.createAI('hard');
  
  return { ai1, ai2 };
}

// Example of using AI to analyze a move
export async function exampleAIUsage() {
  const ai = new HeuristicAI('medium');
  
  // Example game state (simplified)
  const gameState: GameState = {
    edges: new Set(),
    pos: { x: 4, y: 3 },
    current: 0,
    extraTurn: false,
    winner: null,
    blockedLoser: null,
    validMoves: [
      { x: 3, y: 3 },
      { x: 5, y: 3 },
      { x: 4, y: 2 },
      { x: 4, y: 4 }
    ]
  };
  
  const gameConfig: GameConfig = {
    width: 8,
    height: 6,
    goalWidth: 2
  };
  
  // Get AI move
  const aiMove = await ai.analyzeMove(gameState, gameConfig);
  console.log('AI selected move:', aiMove);
  
  return aiMove;
}

// Example of difficulty management
export function exampleDifficultyManagement() {
  const ai = new HeuristicAI('easy');
  
  console.log('Current difficulty:', ai.getDifficulty());
  
  // Change difficulty
  ai.setDifficulty('hard');
  console.log('New difficulty:', ai.getDifficulty());
  
  // Get available difficulties
  const difficulties = AIFactory.getAvailableDifficulties();
  console.log('Available difficulties:', difficulties);
  
  // Get difficulty descriptions
  difficulties.forEach(diff => {
    console.log(`${diff}: ${AIFactory.getDifficultyDescription(diff)}`);
  });
}