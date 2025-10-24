import { Pos, GoalSide, GoalResult } from './types';

// ======= Funkcje pomocnicze =======

export function keyEdge(a: Pos, b: Pos): string {
  // klucz bezkierunkowy dla odcinka (a-b)
  const k1 = `${a.x},${a.y}`;
  const k2 = `${b.x},${b.y}`;
  return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

export function isAdjacent(a: Pos, b: Pos): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (dx === 0 && dy === 0) return false;
  return dx <= 1 && dy <= 1; // poziomo/pionowo/po skosie, max 1 kratka
}

export function isBoundary(p: Pos, width: number, height: number): boolean {
  return p.x === 0 || p.x === width || p.y === 0 || p.y === height;
}

export function inBounds(p: Pos, width: number, height: number): boolean {
  return p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
}

export function isBorderEdge(a: Pos, b: Pos, width: number, height: number): boolean {
  // Zakaz ruchu WZDŁUŻ brzegu.
  // Odcinek leży na brzegu, jeśli oba końce są na tym samym brzegu i odcinek jest poziomy/wyprostowany.
  if (a.y === 0 && b.y === 0) return true; // górna krawędź
  if (a.y === height && b.y === height) return true; // dolna krawędź
  if (a.x === 0 && b.x === 0) return true; // lewa krawędź
  if (a.x === width && b.x === width) return true; // prawa krawędź
  return false;
}

export function centerPosition(width: number, height: number): Pos {
  return { x: Math.floor(width / 2), y: Math.floor(height / 2) };
}

export function clonePosition(p: Pos): Pos {
  return { x: p.x, y: p.y };
}

// ======= Funkcje dla bramki =======

export function goalYRange(height: number, goalWidth: number): number[] {
  // bramka centrowana na środku wysokości, szeroka na `goalWidth` kratek (liczba segmentów)
  const mid = Math.floor(height / 2);
  // Dla prostoty poniżej przyjmiemy klasyczny zakres: od mid - goalWidth/2 + 1 do mid + goalWidth/2
  const a = Math.max(1, mid - Math.floor(goalWidth / 2) + (goalWidth % 2 === 0 ? 0 : 1));
  const b = Math.min(height - 1, mid + Math.ceil(goalWidth / 2));
  const arr: number[] = [];
  for (let y = a; y <= b; y++) arr.push(y);
  return arr;
}

export function isGoal(p: Pos, width: number, height: number, goalWidth: number): GoalResult {
  const ys = goalYRange(height, goalWidth);
  if (p.x === 0 && ys.includes(p.y)) return { side: "LEFT" as const };
  if (p.x === width && ys.includes(p.y)) return { side: "RIGHT" as const };
  return null;
}

// ======= Funkcje dla odbić =======

export function incidentDegree(p: Pos, edges: Set<string>, width: number, height: number): number {
  // Liczba istniejących odcinków stykających się z wierzchołkiem p
  let deg = 0;
  const dirs = [
    { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
    { dx: -1, dy: 0 }, /*self*/            { dx: 1, dy: 0 },
    { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 },
  ];
  for (const d of dirs) {
    const q = { x: p.x + d.dx, y: p.y + d.dy };
    if (!inBounds(q, width, height)) continue;
    if (d.dx === 0 && d.dy === 0) continue;
    if (edges.has(keyEdge(p, q))) deg++;
  }
  return deg;
}

export function willBounce(target: Pos, edges: Set<string>, width: number, height: number): boolean {
  // Odbicie jeśli: target jest na brzegu LUB stopień (NA BAZIE ISTNIEJĄCYCH krawędzi, PRZED dodaniem nowej) >= 1
  if (isBoundary(target, width, height)) return true;
  const deg = incidentDegree(target, edges, width, height);
  return deg >= 1;
}
