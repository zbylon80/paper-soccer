import { Pos, Move } from './types';
import { 
  keyEdge, 
  isAdjacent, 
  inBounds, 
  isBorderEdge, 
  willBounce 
} from './utils';

// ======= Walidacja ruchów =======

export function computeValidMoves(
  pos: Pos, 
  edges: Set<string>, 
  width: number, 
  height: number
): Pos[] {
  const candidates: Pos[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const q = { x: pos.x + dx, y: pos.y + dy };
      if (!inBounds(q, width, height)) continue;
      if (isBorderEdge(pos, q, width, height)) continue; // zakaz ruchu wzdłuż brzegów
      const k = keyEdge(pos, q);
      if (edges.has(k)) continue; // zakaz ponownego użycia odcinka
      candidates.push(q);
    }
  }
  return candidates;
}

export function isValidMove(
  move: Move,
  currentPos: Pos,
  edges: Set<string>,
  width: number,
  height: number
): boolean {
  const fromOK = move.from.x === currentPos.x && move.from.y === currentPos.y;
  const toOK = inBounds(move.to, width, height) && 
               isAdjacent(move.from, move.to) && 
               !isBorderEdge(move.from, move.to, width, height) && 
               !edges.has(keyEdge(move.from, move.to));
  return fromOK && toOK;
}

export function willMoveBounce(
  move: Move,
  edges: Set<string>,
  width: number,
  height: number
): boolean {
  return willBounce(move.to, edges, width, height);
}
