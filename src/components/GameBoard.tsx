import React, { useState, useCallback } from 'react';
import type { GameState, GameConfig, Pos } from '@paper-soccer/core';

interface GameBoardProps {
  gameState: GameState;
  gameConfig: GameConfig;
  onMove: (to: Pos) => void;
  disabled?: boolean;
}

export function GameBoard({ gameState, gameConfig, onMove, disabled }: GameBoardProps) {
  const { width, height, goalWidth } = gameConfig;
  const { pos: ballPosition, validMoves, edges } = gameState;
  
  // State for interaction feedback
  const [hoveredPosition, setHoveredPosition] = useState<Pos | null>(null);
  const [touchedPosition, setTouchedPosition] = useState<Pos | null>(null);
  
  // SVG dimensions and scaling (swapped for 90-degree rotation)
  const padding = 40;
  const cellSize = 35; // Increased from 30 to 35 for better desktop visibility
  const svgWidth = height * cellSize + 2 * padding;   // height gry -> width SVG
  const svgHeight = width * cellSize + 2 * padding;   // width gry -> height SVG
  
  // Convert game coordinates to SVG coordinates (rotate 90 degrees)
  const gameToSvg = (pos: Pos) => ({
    x: pos.y * cellSize + padding,  // y gry -> x SVG
    y: pos.x * cellSize + padding   // x gry -> y SVG
  });
  
  // Generate field grid points (same as before, rotation handled in gameToSvg)
  const generateGridPoints = () => {
    const points = [];
    for (let y = 0; y <= height; y++) {
      for (let x = 0; x <= width; x++) {
        points.push({ x, y });
      }
    }
    return points;
  };
  
  // Generate field boundary lines (original logic, rotation handled in gameToSvg)
  const generateBoundaryLines = () => {
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
  };
  
  // Generate existing game edges
  const generateGameEdges = () => {
    const gameEdges = [];
    for (const edgeKey of edges) {
      // Format klucza: "x1,y1|x2,y2" (używa | jako separator, nie -)
      const [fromStr, toStr] = edgeKey.split('|');
      const [fromX, fromY] = fromStr.split(',').map(Number);
      const [toX, toY] = toStr.split(',').map(Number);
      
      gameEdges.push({
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY }
      });
    }
    return gameEdges;
  };
  
  // Check if a position is a valid move
  const isValidMove = (pos: Pos) => {
    return validMoves.some(move => move.x === pos.x && move.y === pos.y);
  };
  
  // Handle click/touch on a position
  const handlePositionClick = useCallback((pos: Pos) => {
    if (disabled || !isValidMove(pos)) return;
    onMove(pos);
  }, [disabled, validMoves, onMove]);
  
  // Handle mouse events
  const handleMouseEnter = useCallback((pos: Pos) => {
    if (disabled || !isValidMove(pos)) return;
    setHoveredPosition(pos);
  }, [disabled, validMoves]);
  
  const handleMouseLeave = useCallback(() => {
    setHoveredPosition(null);
  }, []);
  
  // Handle touch events
  const handleTouchStart = useCallback((e: React.TouchEvent, pos: Pos) => {
    e.preventDefault(); // Prevent mouse events from firing
    if (disabled) return;
    if (isValidMove(pos)) {
      setTouchedPosition(pos);
    }
  }, [disabled, validMoves]);
  
  const handleTouchEnd = useCallback((e: React.TouchEvent, pos: Pos) => {
    e.preventDefault(); // Always prevent default to avoid zoom
    setTouchedPosition(null);
    if (disabled || !isValidMove(pos)) return;
    onMove(pos);
  }, [disabled, validMoves, onMove]);
  
  const handleTouchCancel = useCallback(() => {
    setTouchedPosition(null);
  }, []);
  
  // Check if position is currently being interacted with
  const isPositionActive = useCallback((pos: Pos) => {
    return (hoveredPosition && hoveredPosition.x === pos.x && hoveredPosition.y === pos.y) ||
           (touchedPosition && touchedPosition.x === pos.x && touchedPosition.y === pos.y);
  }, [hoveredPosition, touchedPosition]);
  
  const gridPoints = generateGridPoints();
  const boundaryLines = generateBoundaryLines();
  const gameEdges = generateGameEdges();
  
  return (
    <div className="game-board">
      <svg
        className="game-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        onTouchStart={(e) => e.preventDefault()}
        onTouchEnd={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      >
        {/* Invisible full-board touch target to prevent zoom anywhere */}
        <rect
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
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
          x={padding}
          y={padding}
          width={height * cellSize}  // height gry -> width SVG
          height={width * cellSize}  // width gry -> height SVG
          fill="rgba(16, 185, 129, 0.1)"
          stroke="none"
        />
        
        {/* Goal areas (now at top and bottom) */}
        <rect
          x={padding + ((height - goalWidth) / 2) * cellSize}
          y={padding - 20}
          width={goalWidth * cellSize}
          height={20}
          fill="rgba(239, 68, 68, 0.2)"
          stroke="rgba(239, 68, 68, 0.5)"
          strokeWidth="2"
        />
        <rect
          x={padding + ((height - goalWidth) / 2) * cellSize}
          y={padding + width * cellSize}
          width={goalWidth * cellSize}
          height={20}
          fill="rgba(239, 68, 68, 0.2)"
          stroke="rgba(239, 68, 68, 0.5)"
          strokeWidth="2"
        />
        
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
        {gameEdges.map((edge, index) => {
          const fromSvg = gameToSvg(edge.from);
          const toSvg = gameToSvg(edge.to);
          return (
            <line
              key={`edge-${index}`}
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
          const touchTargetSize = Math.max(44, cellSize * 1.6); // Increased multiplier from 1.5 to 1.6
          
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
                  pointerEvents: 'none', // Let the touch target handle events
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
}