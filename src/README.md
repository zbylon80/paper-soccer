# Paper Soccer Web Game

A simple, responsive web-based Paper Soccer game that works on both desktop and mobile devices.

## Project Structure

```
src/
├── components/          # React components (to be implemented)
│   ├── GameBoard.tsx   # Main game board component
│   ├── GameControls.tsx # Game controls (undo, reset, etc.)
│   ├── PlayerIndicator.tsx # Current player display
│   └── Instructions.tsx # How to play instructions
├── hooks/              # React hooks (to be implemented)
│   └── useGame.tsx     # Game state management hook
├── styles/             # CSS styles
│   └── game.css        # Responsive game styles
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles with Tailwind
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **@paper-soccer/core** - Game engine (local package)

## Responsive Design

The game uses a mobile-first responsive design approach:

- **Mobile**: Touch-optimized interface with minimum 44px touch targets
- **Tablet**: Adapted layout for medium screens
- **Desktop**: Enhanced with hover effects and keyboard shortcuts
- **Landscape**: Special layout for landscape orientation on mobile

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Game Engine

The game uses the existing `@paper-soccer/core` package which provides:

- `GameEngine` - Main game logic
- `GameState` - Current game state interface
- `DEFAULT_CONFIG` - Default game configuration (10x8 field)
- Move validation and game rules

## Next Steps

The following components need to be implemented in subsequent tasks:

1. GameBoard component with SVG rendering
2. Game state management hook (useGame)
3. Player indicator and game controls
4. Instructions and responsive layout
5. Touch and mouse interaction handling