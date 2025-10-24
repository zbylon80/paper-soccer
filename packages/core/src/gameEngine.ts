import { 
  Pos, 
  Move, 
  Player, 
  GameState, 
  GameConfig, 
  GameResult 
} from './types';
import { 
  keyEdge, 
  centerPosition, 
  clonePosition, 
  isGoal 
} from './utils';
import { 
  computeValidMoves, 
  isValidMove, 
  willMoveBounce 
} from './moveValidation';

// ======= Silnik gry =======

export class GameEngine {
  private config: GameConfig;
  private history: Move[] = [];
  private state: GameState;

  constructor(config: GameConfig) {
    this.config = config;
    this.state = this.initializeGame();
  }

  private initializeGame(): GameState {
    const pos = centerPosition(this.config.width, this.config.height);
    const edges = new Set<string>();
    const validMoves = computeValidMoves(pos, edges, this.config.width, this.config.height);
    
    return {
      edges,
      pos,
      current: 0, // Gracz A zaczyna
      extraTurn: false,
      winner: null,
      blockedLoser: null,
      validMoves
    };
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public getConfig(): GameConfig {
    return { ...this.config };
  }

  public getHistory(): Move[] {
    return [...this.history];
  }

  public makeMove(to: Pos): boolean {
    if (this.state.winner !== null) return false;
    
    const from = this.state.pos;
    const move: Move = { from, to };
    
    if (!isValidMove(move, from, this.state.edges, this.config.width, this.config.height)) {
      return false;
    }

    // Wykonaj ruch
    const k = keyEdge(from, to);
    const bounce = willMoveBounce(move, this.state.edges, this.config.width, this.config.height);

    this.state.edges.add(k);
    this.state.pos = clonePosition(to);
    this.history.push(move);

    // Sprawdź gol
    const goal = isGoal(this.state.pos, this.config.width, this.config.height, this.config.goalWidth);
    if (goal) {
      this.state.winner = this.state.current;
      this.state.extraTurn = false;
      this.state.validMoves = [];
      return true;
    }

    // Obsługa odbić i zmian tury
    if (bounce) {
      this.state.extraTurn = true; // ten sam gracz gra dalej
    } else {
      this.state.current = (this.state.current ^ 1) as Player;
      this.state.extraTurn = false;
    }

    // Sprawdź dostępne ruchy
    this.state.validMoves = computeValidMoves(
      this.state.pos, 
      this.state.edges, 
      this.config.width, 
      this.config.height
    );

    // Sprawdź blokadę
    if (this.state.validMoves.length === 0) {
      this.state.blockedLoser = this.state.current;
    }

    return true;
  }

  public undo(): boolean {
    if (this.history.length === 0) return false;
    
    // Usuń ostatni ruch z historii
    const lastMove = this.history.pop()!;
    const k = keyEdge(lastMove.from, lastMove.to);
    
    // Usuń krawędź
    this.state.edges.delete(k);
    
    // Przywróć pozycję
    this.state.pos = clonePosition(lastMove.from);
    
    // Zresetuj stan gry
    this.state.winner = null;
    this.state.blockedLoser = null;
    
    // Przelicz stan gry od nowa
    this.state = this.simulateHistory(this.history);
    
    return true;
  }

  public reset(): void {
    this.history = [];
    this.state = this.initializeGame();
  }

  public updateConfig(newConfig: GameConfig): void {
    this.config = newConfig;
    this.reset(); // Reset gry przy zmianie konfiguracji
  }

  private simulateHistory(history: Move[]): GameState {
    const edges = new Set<string>();
    let pos = centerPosition(this.config.width, this.config.height);
    let current: Player = 0;
    let winner: Player | null = null;
    let extraTurn = false;

    for (const move of history) {
      const fromOK = move.from.x === pos.x && move.from.y === pos.y;
      const toOK = isValidMove(move, pos, edges, this.config.width, this.config.height);
      
      if (!fromOK || !toOK) {
        // jeśli historia jest niepoprawna, przerwij i zignoruj resztę
        break;
      }
      
      const k = keyEdge(move.from, move.to);
      const bounce = willMoveBounce(move, edges, this.config.width, this.config.height);

      edges.add(k);
      pos = clonePosition(move.to);

      // Gol?
      const goal = isGoal(pos, this.config.width, this.config.height, this.config.goalWidth);
      if (goal) {
        winner = current;
        extraTurn = false;
        break;
      }

      if (bounce) {
        extraTurn = true;
      } else {
        current = (current ^ 1) as Player;
        extraTurn = false;
      }
    }

    // Jeśli brak zwycięzcy, sprawdź dostępne ruchy z aktualnej pozycji
    const validMoves = winner === null ? 
      computeValidMoves(pos, edges, this.config.width, this.config.height) : [];
    
    let blockedLoser: Player | null = null;
    if (winner === null && validMoves.length === 0) {
      blockedLoser = current;
    }

    return { 
      edges, 
      pos, 
      current, 
      extraTurn, 
      winner, 
      blockedLoser, 
      validMoves 
    };
  }
}
