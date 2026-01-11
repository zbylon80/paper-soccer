import React, { useState, useCallback, useMemo } from 'react';
import type { GameState, GameConfig, Pos } from '@paper-soccer/core';
import type { GameMode } from '../types/ai';

interface GameBoardProps {
  gameState: GameState;
  gameConfig: GameConfig;
  onMove: (to: Pos) => void;
  disabled?: boolean;
  gameMode?: GameMode;
}

export const GameBoard = React.memo<GameBoardProps>(({ gameState, gameConfig, onMove, disabled, gameMode = 'human-vs-human' }) => {
  const { width, height, goalWidth } = gameConfig;
  const { pos: ballPosition, validMoves, edges } = gameState;
  
  console.log('GameBoard: RENDER - validMoves:', validMoves);
  console.log('GameBoard: RENDER - ballPosition:', ballPosition);
  console.log('GameBoard: RENDER - validMoves detailed:', validMoves.map(m => `{x:${m.x}, y:${m.y}}`));
  console.log('GameBoard: RENDER - edges:', edges);
  console.log('GameBoard: RENDER - edges array:', Array.from(edges));
  
  // State for interaction feedback
  const [hoveredPosition, setHoveredPosition] = useState<Pos | null>(null);
  const [touchedPosition, setTouchedPosition] = useState<Pos | null>(null);
  
  // SVG dimensions and scaling (swapped for 90-degree rotation) - memoized
  const svgDimensions = useMemo(() => {
    const padding = 40;
    const cellSize = 35;
    return {
      padding,
      cellSize,
      svgWidth: height * cellSize + 2 * padding,
      svgHeight: width * cellSize + 2 * padding
    };
  }, [width, height]);
  
  // Convert game coordinates to SVG coordinates (rotate 90 degrees) - memoized
  const gameToSvg = useCallback((pos: Pos) => ({
    x: pos.y * svgDimensions.cellSize + svgDimensions.padding,
    y: pos.x * svgDimensions.cellSize + svgDimensions.padding
  }), [svgDimensions]);
  
  // Generate field grid points - memoized
  const gridPoints = useMemo(() => {
    const points = [];
    for (let y = 0; y <= height; y++) {
      for (let x = 0; x <= width; x++) {
        points.push({ x, y });
      }
    }
    return points;
  }, [width, height]);
  
  // Generate field boundary lines - memoized
  const boundaryLines = useMemo(() => {
    const lines = [];
    
    // Top boundary
    for (let x = 0; x < width; x++) {
      lines.push({ from: { x, y: 0 }, to: { x: x + 1, y: 0 } });
    }
    
    // Bottom boundary
    for (let x = 0; x < width; x++) {
      lines.push({ from: { x, y: height }, to: { x: x + 1, y: height } });
    }
    
    // Left boundary (with goal opening)
    const goalStart = (height - goalWidth) / 2;
    const goalEnd = goalStart + goalWidth;
    
    for (let y = 0; y < height; y++) {
      if (y < goalStart || y >= goalEnd) {
        lines.push({ from: { x: 0, y }, to: { x: 0, y: y + 1 } });
      }
    }
    
    // Right boundary (with goal opening)
    for (let y = 0; y < height; y++) {
      if (y < goalStart || y >= goalEnd) {
        lines.push({ from: { x: width, y }, to: { x: width, y: y + 1 } });
      }
    }
    
    return lines;
  }, [width, height, goalWidth]);
  
  // Generate existing game edges - memoized for stability but with proper dependency
  const gameEdges = useMemo(() => {
    const gameEdges = [];
    console.log('GameBoard: generating gameEdges - edges from gameState:', edges);
    console.log('GameBoard: generating gameEdges - edges size:', edges.size);
    console.log('GameBoard: generating gameEdges - edges values:', Array.from(edges));
    for (const edgeKey of edges) {
      const [fromStr, toStr] = edgeKey.split('|');
      const [fromX, fromY] = fromStr.split(',').map(Number);
      const [toX, toY] = toStr.split(',').map(Number);
      
      gameEdges.push({
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY }
      });
    }
    console.log('GameBoard: generating gameEdges - generated gameEdges:', gameEdges);
    return gameEdges;
  }, [edges, edges.size]); // Added edges.size to force re-computation when edges change
  
  // Check if a position is a valid move - memoized
  const isValidMove = useCallback((pos: Pos) => {
    return validMoves.some(move => move.x === pos.x && move.y === pos.y);
  }, [validMoves]);
  
  // Handle click/touch on a position - memoized
  const handlePositionClick = useCallback((pos: Pos) => {
    console.log('GameBoard: handlePositionClick called with:', pos);
    console.log('GameBoard: disabled:', disabled, 'isValidMove:', isValidMove(pos));
    if (disabled || !isValidMove(pos)) return;
    console.log('GameBoard: calling onMove with:', pos);
    onMove(pos);
  }, [disabled, isValidMove, onMove]);
  
  // Handle mouse events - memoized
  const handleMouseEnter = useCallback((pos: Pos) => {
    if (disabled || !isValidMove(pos)) return;
    setHoveredPosition(pos);
  }, [disabled, isValidMove]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredPosition(null);
  }, []);
  
  // Handle touch events - memoized
  const handleTouchStart = useCallback((e: React.TouchEvent, pos: Pos) => {
    e.preventDefault();
    if (disabled) return;
    if (isValidMove(pos)) {
      setTouchedPosition(pos);
    }
  }, [disabled, isValidMove]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent, pos: Pos) => {
    e.preventDefault();
    setTouchedPosition(null);
    if (disabled || !isValidMove(pos)) return;
    onMove(pos);
  }, [disabled, isValidMove, onMove]);
  
  const handleTouchCancel = useCallback(() => {
    setTouchedPosition(null);
  }, []);
  
  // Check if position is currently being interacted with - memoized
  const isPositionActive = useCallback((pos: Pos) => {
    return (hoveredPosition && hoveredPosition.x === pos.x && hoveredPosition.y === pos.y) ||
           (touchedPosition && touchedPosition.x === pos.x && touchedPosition.y === pos.y);
  }, [hoveredPosition, touchedPosition]);
  
  return (
    <div className="game-board">
      <svg
        className="game-svg"
        viewBox={`0 0 ${svgDimensions.svgWidth} ${svgDimensions.svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        onTouchStart={(e) => e.preventDefault()}
        onTouchEnd={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      >
        {/* Invisible full-board touch target to prevent zoom anywhere */}
        <rect
          x={0}
          y={0}
          width={svgDimensions.svgWidth}
          height={svgDimensions.svgHeight}
          fill="transparent"
          style={{
            touchAction: 'manipulation',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
          onTouchStart={(e) => e.preventDefault()}
          onTouchEnd={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
        />
        
        {/* Field background (rotated dimensions) */}
        <rect
          x={svgDimensions.padding}
          y={svgDimensions.padding}
          width={height * svgDimensions.cellSize}
          height={width * svgDimensions.cellSize}
          fill="rgba(16, 185, 129, 0.1)"
          stroke="none"
        />
        
        {/* Goal areas (now at top and bottom) with labels */}
        {/* Top goal - corresponds to x=0 in core engine (Player 0's goal) */}
        <rect
          x={svgDimensions.padding + ((height - goalWidth) / 2) * svgDimensions.cellSize}
          y={svgDimensions.padding - 20}
          width={goalWidth * svgDimensions.cellSize}
          height={20}
          fill="rgba(59, 130, 246, 0.2)"
          stroke="rgba(59, 130, 246, 0.5)"
          strokeWidth="2"
        />
        {/* Top goal label */}
        <text
          x={svgDimensions.padding + (height / 2) * svgDimensions.cellSize}
          y={svgDimensions.padding - 25}
          textAnchor="middle"
          fontSize="12"
          fill="rgba(59, 130, 246, 0.8)"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          Player Goal
        </text>
        
        {/* Bottom goal - corresponds to x=width in core engine (Player 1's goal) */}
        <rect
          x={svgDimensions.padding + ((height - goalWidth) / 2) * svgDimensions.cellSize}
          y={svgDimensions.padding + width * svgDimensions.cellSize}
          width={goalWidth * svgDimensions.cellSize}
          height={20}
          fill="rgba(239, 68, 68, 0.2)"
          stroke="rgba(239, 68, 68, 0.5)"
          strokeWidth="2"
        />
        {/* Bottom goal label */}
        <text
          x={svgDimensions.padding + (height / 2) * svgDimensions.cellSize}
          y={svgDimensions.padding + width * svgDimensions.cellSize + 35}
          textAnchor="middle"
          fontSize="12"
          fill="rgba(239, 68, 68, 0.8)"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {gameMode === 'human-vs-ai' ? 'AI Goal' : 'Player 2 Goal'}
        </text>
        
        {/* Field boundary lines */}
        {boundaryLines.map((line, index) => {
          const fromSvg = gameToSvg(line.from);
          const toSvg = gameToSvg(line.to);
          return (
            <line
              key={`boundary-${index}`}
              x1={fromSvg.x}
              y1={fromSvg.y}
              x2={toSvg.x}
              y2={toSvg.y}
              stroke="rgba(16, 185, 129, 0.8)"
              strokeWidth="3"
            />
          );
        })}
        
        {/* Game edges (moves made) */}
        {gameEdges.map((edge) => {
          const fromSvg = gameToSvg(edge.from);
          const toSvg = gameToSvg(edge.to);
          const edgeKey = `${edge.from.x},${edge.from.y}|${edge.to.x},${edge.to.y}`;
          return (
            <line
              key={edgeKey}
              x1={fromSvg.x}
              y1={fromSvg.y}
              x2={toSvg.x}
              y2={toSvg.y}
              stroke="rgba(255, 255, 255, 0.9)"
              strokeWidth="2"
            />
          );
        })}
        
        {/* Grid points */}
        {gridPoints.map((point, index) => {
          const svgPos = gameToSvg(point);
          const isValid = isValidMove(point);
          const isBall = point.x === ballPosition.x && point.y === ballPosition.y;
          const isActive = isPositionActive(point);
          
          // Touch target size - minimum 44px for mobile usability
          const touchTargetSize = Math.max(44, svgDimensions.cellSize * 1.6);
          
          return (
            <g key={`point-${index}`}>
              {/* Invisible touch target for ALL positions to prevent zoom */}
              <circle
                cx={svgPos.x}
                cy={svgPos.y}
                r={touchTargetSize / 2}
                fill="transparent"
                className="touch-target"
                onClick={() => handlePositionClick(point)}
                onMouseEnter={() => handleMouseEnter(point)}
                onMouseLeave={handleMouseLeave}
                onTouchStart={(e) => handleTouchStart(e, point)}
                onTouchEnd={(e) => handleTouchEnd(e, point)}
                onTouchCancel={handleTouchCancel}
                style={{ 
                  cursor: isValid && !disabled ? 'pointer' : 'default',
                  touchAction: 'manipulation'
                }}
              />
              
              {/* Visual point */}
              <circle
                cx={svgPos.x}
                cy={svgPos.y}
                r={isBall ? 8 : isActive ? 6 : 4}
                fill={
                  isBall 
                    ? "rgba(255, 255, 255, 1)" 
                    : isValid 
                      ? isActive 
                        ? "rgba(34, 197, 94, 1)" 
                        : "rgba(34, 197, 94, 0.8)"
                      : "rgba(16, 185, 129, 0.6)"
                }
                stroke={
                  isBall 
                    ? "rgba(0, 0, 0, 0.3)" 
                    : isValid 
                      ? isActive
                        ? "rgba(34, 197, 94, 1)"
                        : "rgba(34, 197, 94, 1)" 
                      : "rgba(16, 185, 129, 0.8)"
                }
                strokeWidth={isBall ? 2 : isActive ? 2 : 1}
                className={isValid ? "transition-all duration-200" : ""}
                style={{ 
                  pointerEvents: 'none',
                  filter: isBall ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' : 'none',
                  transform: isActive ? 'scale(1.2)' : 'scale(1)',
                  transformOrigin: 'center'
                }}
              />
            </g>
          );
        })}
        
        {/* Valid move indicators with enhanced visual feedback */}
        {validMoves.map((move, index) => {
          const svgPos = gameToSvg(move);
          const isActive = isPositionActive(move);
          return (
            <circle
              key={`valid-${index}`}
              cx={svgPos.x}
              cy={svgPos.y}
              r={isActive ? "16" : "12"}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="rgba(34, 197, 94, 0.6)"
              strokeWidth="2"
              strokeDasharray="4,2"
              className={isActive ? "animate-pulse" : "animate-pulse"}
              style={{ 
                pointerEvents: 'none',
                opacity: isActive ? 0.8 : 0.6,
                transition: 'all 0.2s ease'
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.disabled === nextProps.disabled &&
    prevProps.gameMode === nextProps.gameMode &&
    prevProps.gameConfig === nextProps.gameConfig &&
    prevProps.gameState.pos.x === nextProps.gameState.pos.x &&
    prevProps.gameState.pos.y === nextProps.gameState.pos.y &&
    prevProps.gameState.current === nextProps.gameState.current &&
    prevProps.gameState.winner === nextProps.gameState.winner &&
    prevProps.gameState.blockedLoser === nextProps.gameState.blockedLoser &&
    prevProps.gameState.extraTurn === nextProps.gameState.extraTurn &&
    prevProps.gameState.edges.size === nextProps.gameState.edges.size &&
    prevProps.gameState.validMoves.length === nextProps.gameState.validMoves.length
  );
});