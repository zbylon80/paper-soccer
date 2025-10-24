# @paper-soccer/core

Core game engine for Paper Soccer - a strategic board game implementation.

## Features

- **Game Engine**: Complete game logic with move validation, bounce detection, goal scoring, and blocking
- **TypeScript**: Fully typed for better development experience
- **Framework Agnostic**: Can be used with React, React Native, Vue, or any other framework
- **Modular**: Clean separation of concerns with utility functions and game logic

## Installation

```bash
npm install @paper-soccer/core
```

## Usage

### Basic Game Setup

```typescript
import { GameEngine, GameConfig, DEFAULT_CONFIG } from '@paper-soccer/core';

// Create game with default configuration
const config: GameConfig = {
  width: 10,
  height: 8,
  goalWidth: 2
};

const game = new GameEngine(config);

// Get current game state
const state = game.getState();
console.log('Current position:', state.pos);
console.log('Valid moves:', state.validMoves);
console.log('Current player:', state.current);
```

### Making Moves

```typescript
// Make a move
const success = game.makeMove({ x: 5, y: 4 });
if (success) {
  const newState = game.getState();
  console.log('Move successful!');
} else {
  console.log('Invalid move');
}
```

### Game State Management

```typescript
// Undo last move
game.undo();

// Reset game
game.reset();

// Update configuration
game.updateConfig({ width: 12, height: 10, goalWidth: 3 });
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { GameEngine, GameConfig, Pos } from '@paper-soccer/core';

function useGameEngine(config: GameConfig) {
  const [engine] = useState(() => new GameEngine(config));
  const [state, setState] = useState(() => engine.getState());

  useEffect(() => {
    engine.updateConfig(config);
    setState(engine.getState());
  }, [config.width, config.height, config.goalWidth]);

  const makeMove = (to: Pos) => {
    const success = engine.makeMove(to);
    if (success) {
      setState(engine.getState());
    }
  };

  const undo = () => {
    const success = engine.undo();
    if (success) {
      setState(engine.getState());
    }
  };

  const reset = () => {
    engine.reset();
    setState(engine.getState());
  };

  return {
    ...state,
    makeMove,
    undo,
    reset,
    history: engine.getHistory()
  };
}
```

## API Reference

### Types

- `Pos`: Position on the board `{ x: number, y: number }`
- `Move`: Game move `{ from: Pos, to: Pos }`
- `Player`: Player identifier `0 | 1`
- `GameConfig`: Game configuration
- `GameState`: Current game state

### GameEngine Class

#### Constructor
- `new GameEngine(config: GameConfig)`

#### Methods
- `getState(): GameState` - Get current game state
- `getConfig(): GameConfig` - Get game configuration
- `getHistory(): Move[]` - Get move history
- `makeMove(to: Pos): boolean` - Make a move
- `undo(): boolean` - Undo last move
- `reset(): void` - Reset game
- `updateConfig(config: GameConfig): void` - Update configuration

### Utility Functions

- `keyEdge(a: Pos, b: Pos): string` - Generate edge key
- `isAdjacent(a: Pos, b: Pos): boolean` - Check if positions are adjacent
- `isBoundary(p: Pos, width: number, height: number): boolean` - Check if position is on boundary
- `inBounds(p: Pos, width: number, height: number): boolean` - Check if position is in bounds
- `computeValidMoves(pos: Pos, edges: Set<string>, width: number, height: number): Pos[]` - Get valid moves

## Game Rules

1. **Movement**: Players move the ball along grid lines (horizontally, vertically, or diagonally)
2. **No Reuse**: Cannot draw over existing lines
3. **No Border Movement**: Cannot move along the field borders
4. **Bouncing**: Ball bounces when hitting borders or existing lines, giving the same player an extra turn
5. **Goal**: Score by reaching the goal area on the opponent's side
6. **Blocking**: Player loses if they cannot make a valid move

## License

MIT
