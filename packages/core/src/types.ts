// ======= Typy podstawowe =======
export type Pos = { x: number; y: number };
export type Move = { from: Pos; to: Pos };

// ======= Typy stanu gry =======
export type Player = 0 | 1;

export type GameResult = {
  winner: Player | null;
  blockedLoser: Player | null;
};

export type GameState = {
  edges: Set<string>;
  pos: Pos;
  current: Player;
  extraTurn: boolean;
  winner: Player | null;
  blockedLoser: Player | null;
  validMoves: Pos[];
};

export type GameConfig = {
  width: number;
  height: number;
  goalWidth: number;
};

// ======= Typy dla bramki =======
export type GoalSide = "LEFT" | "RIGHT";

export type GoalResult = {
  side: GoalSide;
} | null;
