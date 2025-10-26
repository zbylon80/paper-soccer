import { useMemo, useState, useEffect, useRef } from "react";

// ======= Typy (skopiowane z core) =======
type Pos = { x: number; y: number };
type Move = { from: Pos; to: Pos };
type Player = 0 | 1;
type GameConfig = { width: number; height: number; goalWidth: number };
type GameState = {
    edges: Set<string>;
    pos: Pos;
    current: Player;
    extraTurn: boolean;
    winner: Player | null;
    blockedLoser: Player | null;
    validMoves: Pos[];
    draw: boolean;
};

type DifficultyLevel = "easy" | "normal" | "hard";
type BoardSizeOption = "small" | "medium" | "large";
type OrientationOption = "playerBottom" | "playerTop";
type GoalLabelDisplay = { text: string; color: string };

function defaultGoalWidth(): number {
    return 2;
}

const BOARD_PRESETS: Record<BoardSizeOption, { width: number; height: number; label: string }> = {
    small: { width: 10, height: 8, label: "Małe (10 × 8)" },
    medium: { width: 14, height: 10, label: "Średnie (14 × 10)" },
    large: { width: 18, height: 12, label: "Duże (18 × 12)" },
};

type SimState = {
    pos: Pos;
    edges: Set<string>;
    current: Player;
    extraTurn: boolean;
    winner: Player | null;
    draw: boolean;
    validMoves: Pos[];
};

type MoveAnalysis = {
    move: Pos;
    score: number;
    nextState: SimState;
};

const WIN_SCORE = 100000;
const LOSS_SCORE = -WIN_SCORE;

type SoundType = "move" | "goal" | "draw";

class SoundManager {
    private context: AudioContext | null = null;
    public enabled = true;

    private async ensureContext(): Promise<AudioContext | null> {
        if (typeof window === "undefined") return null;
        const audioWindow = window as Window &
            typeof globalThis & { webkitAudioContext?: typeof AudioContext };
        const AudioCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
        if (!AudioCtor) return null;
        const context = this.context ?? new AudioCtor();
        this.context = context;
        if (context.state === "suspended") {
            try {
                await context.resume();
            } catch {
                return null;
            }
        }
        return context;
    }

    resume() {
        void this.ensureContext();
    }

    play(type: SoundType) {
        if (!this.enabled) return;
        void this.ensureContext().then((ctx) => {
            if (!ctx) return;
            switch (type) {
                case "move":
                    this.playMove(ctx);
                    break;
                case "goal":
                    this.playGoal(ctx);
                    break;
                case "draw":
                    this.playDraw(ctx);
                    break;
            }
        });
    }

    private triggerTone(
        ctx: AudioContext,
        frequency: number,
        duration: number,
        {
            delay = 0,
            type = "triangle",
            volume = 0.22,
        }: { delay?: number; type?: OscillatorType; volume?: number } = {}
    ) {
        const start = ctx.currentTime + delay + 0.01;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);

        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        oscillator.start(start);
        oscillator.stop(start + duration + 0.05);
    }

    private playMove(ctx: AudioContext) {
        this.triggerTone(ctx, 520, 0.12, { type: "triangle", volume: 0.18 });
        this.triggerTone(ctx, 660, 0.08, { delay: 0.07, type: "sine", volume: 0.15 });
    }

    private playGoal(ctx: AudioContext) {
        this.triggerTone(ctx, 420, 0.2, { type: "sawtooth", volume: 0.24 });
        this.triggerTone(ctx, 640, 0.32, { delay: 0.12, type: "triangle", volume: 0.22 });
        this.triggerTone(ctx, 880, 0.4, { delay: 0.28, type: "square", volume: 0.18 });
    }

    private playDraw(ctx: AudioContext) {
        this.triggerTone(ctx, 360, 0.24, { type: "sine", volume: 0.16 });
        this.triggerTone(ctx, 280, 0.26, { delay: 0.16, type: "triangle", volume: 0.14 });
    }
}

function computeGoalCenter(height: number, goalWidth: number): number {
    const ys = goalYRange(height, goalWidth);
    if (ys.length === 0) return height / 2;
    return ys.reduce((sum, value) => sum + value, 0) / ys.length;
}

function createSimState(
    pos: Pos,
    edges: Set<string>,
    current: Player,
    extraTurn: boolean,
    validMoves: Pos[],
    winner: Player | null = null,
    draw = false
): SimState {
    return {
        pos,
        edges,
        current,
        extraTurn,
        winner,
        draw,
        validMoves
    };
}

type TranspositionEntry = { depth: number; value: number };

function buildStateKey(state: SimState): string {
    const edgesKey = Array.from(state.edges).sort().join(";");
    const movesKey = state.validMoves
        .map((m) => `${m.x},${m.y}`)
        .sort()
        .join(";");
    return [
        state.pos.x,
        state.pos.y,
        state.current,
        state.extraTurn ? 1 : 0,
        state.validMoves.length,
        state.winner ?? "null",
        state.draw ? 1 : 0,
        movesKey,
        edgesKey,
    ].join("|");
}

function simulateMove(
    state: SimState,
    move: Pos,
    config: GameConfig,
    stalemateAsDraw: boolean
): SimState {
    const bounce = willBounce(move, state.edges, config.width, config.height);
    const newEdges = new Set(state.edges);
    newEdges.add(keyEdge(state.pos, move));

    const goal = isGoal(move, config.width, config.height, config.goalWidth);
    if (goal) {
        const scoringPlayer: Player = goal.side === "LEFT" ? 0 : 1;
        return createSimState(move, newEdges, state.current, false, [], scoringPlayer, false);
    }

    let nextCurrent = state.current;
    let nextExtraTurn = false;
    if (bounce) {
        nextExtraTurn = true;
    } else {
        nextCurrent = (state.current ^ 1) as Player;
    }

    const nextValidMoves = computeValidMoves(move, newEdges, config.width, config.height);
    if (nextValidMoves.length === 0) {
        if (stalemateAsDraw) {
            return createSimState(move, newEdges, nextCurrent, false, [], null, true);
        }
        const winner: Player = (nextCurrent ^ 1) as Player;
        return createSimState(move, newEdges, nextCurrent, false, [], winner, false);
    }

    return createSimState(move, newEdges, nextCurrent, nextExtraTurn, nextValidMoves, null, false);
}

function evaluateMove(
    baseState: SimState,
    move: Pos,
    player: Player,
    config: GameConfig,
    goalCenter: number,
    stalemateAsDraw: boolean
): MoveAnalysis {
    const result = simulateMove(baseState, move, config, stalemateAsDraw);

    const targetSide = player === 1 ? "RIGHT" : "LEFT";
    const opponentSide = player === 1 ? "LEFT" : "RIGHT";
    const direction = player === 1 ? 1 : -1;

    if (result.winner !== null) {
        const score = result.winner === player ? WIN_SCORE : LOSS_SCORE;
        return { move, score, nextState: result };
    }

    if (result.draw) {
        const drawScore = stalemateAsDraw ? -200 : -400;
        return { move, score: drawScore, nextState: result };
    }

    let score = 0;
    const forwardProgress = (move.x - baseState.pos.x) * direction;
    score += forwardProgress * 42;

    const targetX = player === 1 ? config.width : 0;
    const distanceToTarget = Math.abs(targetX - move.x);
    score -= distanceToTarget * 6;

    score -= Math.abs(goalCenter - move.y) * 9;

    const ownGoalX = player === 1 ? 0 : config.width;
    const distanceFromOwnGoal = Math.abs(move.x - ownGoalX);
    score += distanceFromOwnGoal * 3.5;

    const distanceFromWalls = Math.min(move.y, config.height - move.y);
    score += distanceFromWalls * 4;

    if (player === 1 && move.x <= 1) score -= 45;
    if (player === 0 && move.x >= config.width - 1) score -= 45;

    const responseMoves = result.validMoves;
    if (result.extraTurn) {
        score += 18;
        score += responseMoves.length * 1.8;
        const followWin = responseMoves.some((follow) => {
            const goal = isGoal(follow, config.width, config.height, config.goalWidth);
            return goal?.side === targetSide;
        });
        if (followWin) score += 120;
        const opponentCounter = computeValidMoves(
            result.pos,
            result.edges,
            config.width,
            config.height
        ).filter((follow) => {
            const goal = isGoal(follow, config.width, config.height, config.goalWidth);
            return goal?.side === opponentSide;
        }).length;
        if (opponentCounter > 0) score -= opponentCounter * 90;
    } else {
        if (responseMoves.length === 0) {
            score += stalemateAsDraw ? 20 : 160;
        } else {
            const opponentGoal = responseMoves.some((follow) => {
                const goal = isGoal(follow, config.width, config.height, config.goalWidth);
                return goal?.side === opponentSide;
            });
            if (opponentGoal) score -= 160;
            score -= responseMoves.length * 2.4;
            const trapped = responseMoves.every((follow) => incidentDegree(follow, result.edges, config.width, config.height) >= 4);
            if (trapped) score += 55;
        }
    }

    return { move, score, nextState: result };
}

function evaluateState(
    state: SimState,
    config: GameConfig,
    goalCenter: number
): number {
    if (state.winner !== null) {
        return state.winner === 1 ? WIN_SCORE : LOSS_SCORE;
    }
    if (state.draw) return 0;

    let score = (state.pos.x - config.width / 2) * 26;
    score -= Math.abs(goalCenter - state.pos.y) * 9;

    const aiProgress = state.pos.x;
    const humanProgress = config.width - state.pos.x;
    score += (aiProgress - humanProgress) * 4;

    const edgeDistanceX = Math.min(state.pos.x, config.width - state.pos.x);
    const edgeDistanceY = Math.min(state.pos.y, config.height - state.pos.y);
    score += edgeDistanceX * 3.5;
    score += edgeDistanceY * 2.5;

    const availableMoves = state.validMoves.length > 0
        ? state.validMoves
        : computeValidMoves(state.pos, state.edges, config.width, config.height);
    const mobility = availableMoves.length;

    score += (state.current === 1 ? 1 : -1) * mobility * 3.5;

    const opponentMoves = computeValidMoves(state.pos, state.edges, config.width, config.height);
    score -= opponentMoves.length * 1.6;

    const aiImmediateGoal = availableMoves.some((m) => isGoal(m, config.width, config.height, config.goalWidth)?.side === "RIGHT");
    const humanImmediateGoal = availableMoves.some((m) => isGoal(m, config.width, config.height, config.goalWidth)?.side === "LEFT");
    const opponentImmediateGoal = opponentMoves.some((m) => isGoal(m, config.width, config.height, config.goalWidth)?.side === "LEFT");

    if (aiImmediateGoal) score += 200;
    if (humanImmediateGoal) score -= 220;
    if (opponentImmediateGoal) score -= 260;

    if (edgeDistanceX <= 1 || edgeDistanceY <= 1) score -= 45;

    return score;
}

function shouldExtendSearch(state: SimState, config: GameConfig): boolean {
    if (state.extraTurn) return true;
    if (state.winner !== null || state.draw) return false;

    const moves = state.validMoves.length > 0
        ? state.validMoves
        : computeValidMoves(state.pos, state.edges, config.width, config.height);

    if (moves.length <= 2) return true;

    const goalThreat = moves.some((m) => isGoal(m, config.width, config.height, config.goalWidth));
    if (goalThreat) return true;

    const opponentMoves = computeValidMoves(state.pos, state.edges, config.width, config.height);
    const opponentThreat = opponentMoves.some((m) => isGoal(m, config.width, config.height, config.goalWidth));
    return opponentThreat;
}

function minimax(
    state: SimState,
    depth: number,
    config: GameConfig,
    goalCenter: number,
    stalemateAsDraw: boolean,
    alpha: number,
    beta: number,
    allowQuiescence = true,
    cache?: Map<string, TranspositionEntry>
): number {
    const key = cache ? buildStateKey(state) : null;
    if (cache && key) {
        const cached = cache.get(key);
        if (cached && cached.depth >= depth) {
            return cached.value;
        }
    }

    if (depth === 0 || state.winner !== null || state.draw) {
        if (depth === 0 && allowQuiescence && shouldExtendSearch(state, config)) {
            const extended = minimax(state, 1, config, goalCenter, stalemateAsDraw, alpha, beta, false, cache);
            if (cache && key) cache.set(key, { depth, value: extended });
            return extended;
        }
        const evaluation = evaluateState(state, config, goalCenter);
        if (cache && key) cache.set(key, { depth, value: evaluation });
        return evaluation;
    }

    const moves = state.validMoves.length > 0
        ? state.validMoves
        : computeValidMoves(state.pos, state.edges, config.width, config.height);

    if (moves.length === 0) {
        if (stalemateAsDraw) return 0;
        return state.current === 1 ? LOSS_SCORE : WIN_SCORE;
    }

    if (state.current === 1) {
        let value = -Infinity;
        for (const move of moves) {
            const next = simulateMove(state, move, config, stalemateAsDraw);
            const evaluation = minimax(next, depth - 1, config, goalCenter, stalemateAsDraw, alpha, beta, allowQuiescence, cache);
            value = Math.max(value, evaluation);
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        }
        if (cache && key) cache.set(key, { depth, value });
        return value;
    } else {
        let value = Infinity;
        for (const move of moves) {
            const next = simulateMove(state, move, config, stalemateAsDraw);
            const evaluation = minimax(next, depth - 1, config, goalCenter, stalemateAsDraw, alpha, beta, allowQuiescence, cache);
            value = Math.min(value, evaluation);
            beta = Math.min(beta, value);
            if (beta <= alpha) break;
        }
        if (cache && key) cache.set(key, { depth, value });
        return value;
    }
}

function chooseComputerMove(
    state: SimState,
    config: GameConfig,
    options: {
        difficulty: DifficultyLevel;
        stalemateAsDraw: boolean;
        goalCenter: number;
        log: boolean;
    }
): MoveAnalysis {
    const analyses = state.validMoves.map((move) =>
        evaluateMove(state, move, 1, config, options.goalCenter, options.stalemateAsDraw)
    );

    const transpositionTable = new Map<string, TranspositionEntry>();

    const difficultySettings = {
        easy: { searchDepth: 0, depthWeight: 0, candidateLimit: analyses.length, noiseFactor: 0.55 },
        normal: { searchDepth: 2, depthWeight: 0.6, candidateLimit: Math.min(analyses.length, 8), noiseFactor: 0 },
        hard: { searchDepth: 4, depthWeight: 0.75, candidateLimit: analyses.length, noiseFactor: 0 },
    } as const;

    const settings = difficultySettings[options.difficulty];

    let chosen: MoveAnalysis | null = null;
    let bestScore = -Infinity;

    if (options.difficulty === "easy") {
        const jittered = analyses.map((analysis) => ({
            ...analysis,
            score: analysis.score * settings.noiseFactor + Math.random() * 160,
        }));
        chosen = jittered.reduce((best, current) => (current.score > best.score ? current : best));
    } else {
        const ordered = analyses
            .slice()
            .sort((a, b) => b.score - a.score)
            .slice(0, settings.candidateLimit);

        for (const analysis of ordered) {
            let totalScore = analysis.score;
            if (
                settings.searchDepth > 0 &&
                analysis.nextState.winner === null &&
                !analysis.nextState.draw
            ) {
                const searchScore = minimax(
                    analysis.nextState,
                    settings.searchDepth - 1,
                    config,
                    options.goalCenter,
                    options.stalemateAsDraw,
                    -Infinity,
                    Infinity,
                    true,
                    transpositionTable
                );
                totalScore += searchScore * settings.depthWeight;
            }

            if (totalScore > bestScore + 1e-3) {
                bestScore = totalScore;
                chosen = analysis;
            } else if (Math.abs(totalScore - bestScore) <= 1e-3 && chosen) {
                if (analysis.score > chosen.score + 1e-3) {
                    chosen = analysis;
                }
            }
        }
    }

    if (!chosen) {
        chosen = analyses[0];
    }

    if (options.log && typeof window !== "undefined") {
        console.groupCollapsed(`[AI] tryb: ${options.difficulty}`);
        analyses
            .slice()
            .sort((a, b) => b.score - a.score)
            .forEach((analysis) => {
                console.log("ruch", analysis.move, "ocena:", analysis.score);
            });
        console.log("wybór:", chosen.move, "ocena:", chosen.score);
        console.groupEnd();
    }

    return chosen;
}

// ======= Funkcje pomocnicze (skopiowane z core) =======
function keyEdge(a: Pos, b: Pos): string {
    const k1 = `${a.x},${a.y}`;
    const k2 = `${b.x},${b.y}`;
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

function isAdjacent(a: Pos, b: Pos): boolean {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (dx === 0 && dy === 0) return false;
    return dx <= 1 && dy <= 1;
}

function inBounds(p: Pos, width: number, height: number): boolean {
    return p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
}

function isBorderEdge(a: Pos, b: Pos, width: number, height: number): boolean {
    if (a.y === 0 && b.y === 0) return true;
    if (a.y === height && b.y === height) return true;
    if (a.x === 0 && b.x === 0) return true;
    if (a.x === width && b.x === width) return true;
    return false;
}

function centerPosition(width: number, height: number): Pos {
    return { x: Math.floor(width / 2), y: Math.floor(height / 2) };
}

function goalYRange(height: number, goalWidth: number): number[] {
    const rawStart = Math.floor((height - goalWidth) / 2);
    const maxStart = Math.max(1, height - goalWidth);
    const start = Math.min(Math.max(rawStart, 1), maxStart);

    const arr: number[] = [];
    for (let i = 0; i < goalWidth; i++) {
        const y = start + i;
        if (y >= 1 && y <= height - 1) {
            arr.push(y);
        }
    }
    return arr;
}

function isGoal(p: Pos, width: number, height: number, goalWidth: number) {
    const ys = goalYRange(height, goalWidth);
    if (p.x === 0 && ys.includes(p.y)) return { side: "LEFT" as const };
    if (p.x === width && ys.includes(p.y)) return { side: "RIGHT" as const };
    return null;
}

function incidentDegree(p: Pos, edges: Set<string>, width: number, height: number): number {
    let deg = 0;
    const dirs = [
        { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
        { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
    ];
    for (const d of dirs) {
        const q = { x: p.x + d.dx, y: p.y + d.dy };
        if (!inBounds(q, width, height)) continue;
        if (d.dx === 0 && d.dy === 0) continue;
        if (edges.has(keyEdge(p, q))) deg++;
    }
    return deg;
}

function willBounce(target: Pos, edges: Set<string>, width: number, height: number): boolean {
    if (target.x === 0 || target.x === width || target.y === 0 || target.y === height) return true;
    const deg = incidentDegree(target, edges, width, height);
    return deg >= 1;
}

function computeValidMoves(pos: Pos, edges: Set<string>, width: number, height: number): Pos[] {
    const candidates: Pos[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const q = { x: pos.x + dx, y: pos.y + dy };
            if (!inBounds(q, width, height)) continue;
            if (isBorderEdge(pos, q, width, height)) continue;
            const k = keyEdge(pos, q);
            if (edges.has(k)) continue;
            candidates.push(q);
        }
    }
    return candidates;
}

// ======= Prosty silnik gry =======
function useSimpleGameEngine(config: GameConfig, options: { stalemateAsDraw: boolean }) {
    const pickStartingPlayer = (): Player => (Math.random() < 0.5 ? 0 : 1);

    const [history, setHistory] = useState<Move[]>([]);
    const [state, setState] = useState<GameState>(() => {
        const pos = centerPosition(config.width, config.height);
        const edges = new Set<string>();
        const validMoves = computeValidMoves(pos, edges, config.width, config.height);
        return {
            edges,
            pos,
            current: pickStartingPlayer(),
            extraTurn: false,
            winner: null,
            blockedLoser: null,
            validMoves,
            draw: false
        };
    });

    const makeMove = (to: Pos) => {
        if (state.winner !== null || state.draw) return;

        const from = state.pos;
        const move: Move = { from, to };

        if (!inBounds(to, config.width, config.height) ||
            !isAdjacent(from, to) ||
            isBorderEdge(from, to, config.width, config.height) ||
            state.edges.has(keyEdge(from, to))) {
            return;
        }

        const k = keyEdge(from, to);
        const bounce = willBounce(to, state.edges, config.width, config.height);

        const newEdges = new Set(state.edges);
        newEdges.add(k);
        const newPos = { x: to.x, y: to.y };
        const newHistory = [...history, move];

        // Sprawdź gol
        const goal = isGoal(newPos, config.width, config.height, config.goalWidth);
        if (goal) {
            const scoringPlayer: Player = goal.side === "LEFT" ? 0 : 1;

            setState({
                edges: newEdges,
                pos: newPos,
                current: state.current,
                extraTurn: false,
                winner: scoringPlayer,
                blockedLoser: null,
                validMoves: [],
                draw: false
            });
            setHistory(newHistory);
            return;
        }

        // Obsługa odbić i zmian tury
        let newCurrent = state.current;
        let newExtraTurn = false;
        if (bounce) {
            newExtraTurn = true;
        } else {
            newCurrent = (state.current ^ 1) as Player;
            newExtraTurn = false;
        }

        // Sprawdź dostępne ruchy
        const newValidMoves = computeValidMoves(newPos, newEdges, config.width, config.height);

        if (newValidMoves.length === 0) {
            if (options.stalemateAsDraw) {
                setState({
                    edges: newEdges,
                    pos: newPos,
                    current: newCurrent,
                    extraTurn: false,
                    winner: null,
                    blockedLoser: null,
                    validMoves: [],
                    draw: true
                });
            } else {
                setState({
                    edges: newEdges,
                    pos: newPos,
                    current: newCurrent,
                    extraTurn: false,
                    winner: null,
                    blockedLoser: newCurrent,
                    validMoves: [],
                    draw: false
                });
            }
            setHistory(newHistory);
            return;
        }

        setState({
            edges: newEdges,
            pos: newPos,
            current: newCurrent,
            extraTurn: newExtraTurn,
            winner: null,
            blockedLoser: null,
            validMoves: newValidMoves,
            draw: false
        });
        setHistory(newHistory);
    };

    const reset = () => {
        setHistory([]);
        const pos = centerPosition(config.width, config.height);
        const edges = new Set<string>();
        const validMoves = computeValidMoves(pos, edges, config.width, config.height);
        setState({
            edges,
            pos,
            current: pickStartingPlayer(),
            extraTurn: false,
            winner: null,
            blockedLoser: null,
            validMoves,
            draw: false
        });
    };

    return {
        ...state,
        makeMove,
        reset,
        history
    };
}

// ======= Komponent =======
const PADDING = 24;
const MAX_BOARD_SIZE = 720; // maksymalny rozmiar boiska w px

function BoardSVG({
    W,
    H,
    goal,
    edges,
    pos,
    validMoves,
    onChoose,
    orientation,
    topLabel,
    bottomLabel,
    lastMove,
}: {
    W: number;
    H: number;
    goal: number;
    edges: Set<string>;
    pos: Pos;
    validMoves: Pos[];
    onChoose: (p: Pos) => void;
    orientation: OrientationOption;
    topLabel: GoalLabelDisplay;
    bottomLabel: GoalLabelDisplay;
    lastMove?: Move;
}) {
    const stripeId = useMemo(() => `pitch-stripe-${W}-${H}`, [W, H]);
    const goalPatternId = useMemo(() => `goal-net-${W}-${H}`, [W, H]);

    // Oblicz rozmiar komórki na podstawie proporcji boiska
    const aspectRatio = W / H;
    let cellSize: number;

    if (aspectRatio > 1) {
        // Boisko szersze niż wyższe
        cellSize = Math.floor(MAX_BOARD_SIZE / W);
    } else {
        // Boisko wyższe niż szersze lub kwadratowe
        cellSize = Math.floor(MAX_BOARD_SIZE / H);
    }

    // Minimalny rozmiar komórki
    cellSize = Math.max(cellSize, 20);

    const goalDepth = Math.max(cellSize * 1.1, 32);
    const padX = PADDING + goalDepth;
    const padY = PADDING;

    const width = W * cellSize + padX * 2;
    const height = H * cellSize + padY * 2;

    const toXY = (p: Pos) => ({
        cx: padX + p.x * cellSize,
        cy: padY + p.y * cellSize,
    });

    const parseKey = (k: string): [Pos, Pos] => {
        const [a, b] = k.split("|");
        const [ax, ay] = a.split(",").map(Number);
        const [bx, by] = b.split(",").map(Number);
        return [{ x: ax, y: ay }, { x: bx, y: by }];
    };

    const goalYRange = (height: number, goalWidth: number): number[] => {
        const rawStart = Math.floor((height - goalWidth) / 2);
        const maxStart = Math.max(1, height - goalWidth);
        const start = Math.min(Math.max(rawStart, 1), maxStart);

        const arr: number[] = [];
        for (let i = 0; i < goalWidth; i++) {
            const y = start + i;
            if (y >= 1 && y <= height - 1) {
                arr.push(y);
            }
        }
        return arr;
    };

    const ysGoal = goalYRange(H, goal);
    const lastMoveKey = useMemo(() => {
        if (!lastMove) return null;
        return keyEdge(lastMove.from, lastMove.to);
    }, [lastMove]);

    const borderSegments: Array<{ x1: number; y1: number; x2: number; y2: number; side?: "LEFT" | "RIGHT" }> = [];
    borderSegments.push({ x1: 0, y1: 0, x2: W, y2: 0 });
    borderSegments.push({ x1: 0, y1: H, x2: W, y2: H });

    function buildVerticalRuns(x: number, goalYs: number[], side: "LEFT" | "RIGHT") {
        const runs: Array<{ y1: number; y2: number }> = [];
        let runStart: number | null = null;

        for (let y = 0; y <= H; y++) {
            const isGoalY = goalYs.includes(y);

            if (!isGoalY) {
                // To nie jest bramka - kontynuuj lub zacznij segment
                if (runStart === null) runStart = y;
            } else {
                // To jest bramka - zakończ segment jeśli był aktywny
                if (runStart !== null && y > runStart) {
                    runs.push({ y1: runStart, y2: y });
                }
                runStart = null;
            }
        }

        // Zakończ ostatni segment jeśli był aktywny
        if (runStart !== null && H > runStart) {
            runs.push({ y1: runStart, y2: H });
        }

        return runs.map((r) => ({ x1: x, y1: r.y1, x2: x, y2: r.y2, side }));
    }
    borderSegments.push(...buildVerticalRuns(0, ysGoal, "LEFT"));
    borderSegments.push(...buildVerticalRuns(W, ysGoal, "RIGHT"));

    const shouldRotate = orientation === "playerBottom" || orientation === "playerTop";
    const containerStyle = shouldRotate
        ? { width: `${height}px`, height: `${width}px` }
        : { width: `${width}px`, height: `${height}px` };
    const svgTransformStyle = shouldRotate
        ? {
              transform:
                  orientation === "playerBottom"
                      ? `matrix(0,1,-1,0,${height},0)`
                      : `matrix(0,-1,1,0,0,${width})`,
              transformOrigin: "0 0",
          }
        : undefined;
    const labelInset = Math.max(16, padY * 0.55);
    const labelFontSize = Math.max(14, cellSize * 0.45);

    return (
        <div className="w-full flex justify-center items-center">
            <div style={containerStyle} className="relative">
                <svg
                    width={width}
                    height={height}
                    className="rounded-3xl shadow-2xl p-2 select-none ring-4 ring-emerald-900/60 bg-emerald-900/60"
                    style={svgTransformStyle}
                >
                <defs>
                    <pattern id={stripeId} patternUnits="userSpaceOnUse" width={cellSize * 2} height={cellSize * 2}>
                        <rect width={cellSize * 2} height={cellSize} fill="rgba(255,255,255,0.04)" />
                        <rect y={cellSize} width={cellSize * 2} height={cellSize} fill="rgba(0,0,0,0.05)" />
                    </pattern>
                    <pattern
                        id={goalPatternId}
                        patternUnits="userSpaceOnUse"
                        width={Math.max(8, cellSize / 1.8)}
                        height={Math.max(8, cellSize / 1.8)}
                    >
                        <path
                            d={`M0 0 L${Math.max(8, cellSize / 1.8)} ${Math.max(8, cellSize / 1.8)}`}
                            stroke="rgba(255,255,255,0.45)"
                            strokeWidth={Math.max(0.8, cellSize / 18)}
                        />
                        <path
                            d={`M${Math.max(8, cellSize / 1.8)} 0 L0 ${Math.max(8, cellSize / 1.8)}`}
                            stroke="rgba(255,255,255,0.45)"
                            strokeWidth={Math.max(0.8, cellSize / 18)}
                        />
                    </pattern>
                </defs>

                <rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    rx={24}
                    fill="#166534"
                />
                <rect
                    x={goalDepth / 2 + 10}
                    y={8}
                    width={width - (goalDepth + 20)}
                    height={height - 16}
                    rx={16}
                    fill={`url(#${stripeId})`}
                    opacity={0.5}
                />

                {/* Bramki usunięte na życzenie */}

                {/* Linia środkowa */}
                {(() => {
                    const midX = padX + (W / 2) * cellSize;
                    return (
                        <line
                            x1={midX}
                            y1={padY}
                            x2={midX}
                            y2={height - padY}
                            stroke="rgba(255,255,255,0.55)"
                            strokeWidth={Math.max(2, cellSize / 16)}
                            strokeDasharray={`${cellSize / 2}`}
                        />
                    );
                })()}

                {/* Koło środkowe */}
                {(() => {
                    const centerX = padX + (W / 2) * cellSize;
                    const centerY = padY + (H / 2) * cellSize;
                    const radius = Math.max(cellSize * 1.2, 32);
                    return (
                        <circle
                            cx={centerX}
                            cy={centerY}
                            r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth={Math.max(2, cellSize / 20)}
                        />
                    );
                })()}

                {/* Siatka punktów */}
                {Array.from({ length: H + 1 }, (_, y) => (
                    Array.from({ length: W + 1 }, (_, x) => {
                        const { cx, cy } = toXY({ x, y });
                        return (
                            <circle
                                key={`pt-${x}-${y}`}
                                cx={cx}
                                cy={cy}
                                r={Math.max(2, cellSize / 16)}
                                fill="rgba(255,255,255,0.18)"
                            />
                        );
                    })
                ))}

                {/* Granica boiska */}
                {borderSegments.map((s, i) => {
                    const a = toXY({ x: s.x1, y: s.y1 });
                    const b = toXY({ x: s.x2, y: s.y2 });
                    return (
                        <line
                            key={`border-${i}`}
                            x1={a.cx}
                            y1={a.cy}
                            x2={b.cx}
                            y2={b.cy}
                            strokeWidth={Math.max(2.5, cellSize / 15)}
                            strokeOpacity={0.95}
                            strokeDasharray=""
                            stroke="rgba(255,255,255,0.92)"
                        />
                    );
                })}

                {/* Odcinki gry */}
                {Array.from(edges).map((k) => {
                    const [a, b] = parseKey(k);
                    const p1 = toXY(a);
                    const p2 = toXY(b);
                    const isLast = lastMoveKey !== null && k === lastMoveKey;
                    return (
                        <line
                            key={k}
                            x1={p1.cx}
                            y1={p1.cy}
                            x2={p2.cx}
                            y2={p2.cy}
                            strokeWidth={Math.max(3, cellSize / 10)}
                            stroke="#f1f5f9"
                            strokeLinecap="round"
                            className={isLast ? "edge-line edge-last" : "edge-line"}
                        />
                    );
                })}

                {/* Piłka */}
                {(() => {
                    const { cx, cy } = toXY(pos);
                    const ballRadius = Math.max(6, cellSize / 5);
                    const innerRadius = Math.max(4, cellSize / 7);
                    const centerRadius = Math.max(2, cellSize / 15);
                    return (
                        <g
                            className="ball-sprite"
                            style={{
                                transform: `translate(${cx}px, ${cy}px)`,
                                transformBox: "fill-box",
                                transformOrigin: "center",
                            }}
                        >
                            <circle cx={0} cy={0} r={ballRadius} fill="black" />
                            <circle cx={0} cy={0} r={innerRadius} fill="white" />
                            <circle cx={0} cy={0} r={centerRadius} fill="black" />
                        </g>
                    );
                })()}

                {/* Podświetlenie możliwych ruchów */}
                {validMoves.map((p, i) => {
                    const { cx, cy } = toXY(p);
                    const highlightRadius = Math.max(10, cellSize / 4);
                    const dotRadius = Math.max(4, cellSize / 10);
                    return (
                        <g key={`mv-${i}`} onClick={() => onChoose(p)} className="cursor-pointer">
                            <circle cx={cx} cy={cy} r={highlightRadius} fill="rgba(251, 191, 36, 0.35)" />
                            <circle cx={cx} cy={cy} r={dotRadius} fill="#f97316" />
                        </g>
                    );
                })}
            </svg>
                <div
                    className="absolute font-semibold uppercase tracking-wide text-center select-none pointer-events-none"
                    style={{
                        top: `${labelInset}px`,
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: topLabel.color,
                        fontSize: `${labelFontSize}px`,
                        whiteSpace: "nowrap",
                    }}
                >
                    {topLabel.text}
                </div>
                <div
                    className="absolute font-semibold uppercase tracking-wide text-center select-none pointer-events-none"
                    style={{
                        bottom: `${labelInset}px`,
                        left: "50%",
                        transform: "translateX(-50%)",
                        color: bottomLabel.color,
                        fontSize: `${labelFontSize}px`,
                        whiteSpace: "nowrap",
                    }}
                >
                    {bottomLabel.text}
                </div>
        </div>
    </div>
    );
}

export default function PaperSoccerSimple() {
    const [boardSize, setBoardSize] = useState<BoardSizeOption>("medium");
    const [config, setConfig] = useState<GameConfig>(() => {
        const preset = BOARD_PRESETS.medium;
        return { width: preset.width, height: preset.height, goalWidth: defaultGoalWidth() };
    });
    const [mode, setMode] = useState<"human" | "computer">("computer");
    const [difficulty, setDifficulty] = useState<DifficultyLevel>("normal");
    const [orientation, setOrientation] = useState<OrientationOption>("playerBottom");
    const stalemateAsDraw = false;
    const [pendingReset, setPendingReset] = useState(false);
    const soundManager = useMemo(() => new SoundManager(), []);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [statusFlash, setStatusFlash] = useState<"goal" | "draw" | null>(null);
    const {
        edges,
        pos,
        current,
        extraTurn,
        winner,
        blockedLoser,
        validMoves,
        history,
        draw,
        makeMove,
        reset
    } = useSimpleGameEngine(config, { stalemateAsDraw });

    const prevHistory = useRef(history.length);
    const prevWinner = useRef<Player | null>(winner);
    const prevDraw = useRef(draw);

    useEffect(() => {
        soundManager.enabled = soundEnabled;
    }, [soundEnabled, soundManager]);

    useEffect(() => {
        const unlock = () => soundManager.resume();
        if (typeof window !== "undefined") {
            window.addEventListener("pointerdown", unlock, { once: true });
        }
        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("pointerdown", unlock);
            }
        };
    }, [soundManager]);

    useEffect(() => {
        if (!pendingReset) return;
        reset();
        setPendingReset(false);
    }, [pendingReset, reset]);

    useEffect(() => {
        if (history.length <= prevHistory.current) {
            prevHistory.current = history.length;
            return;
        }
        soundManager.play("move");
        prevHistory.current = history.length;
    }, [history.length, soundManager]);

    useEffect(() => {
        if (winner !== null && prevWinner.current === null) {
            soundManager.play("goal");
            setStatusFlash("goal");
        } else if (winner === null && prevWinner.current !== null) {
            setStatusFlash(null);
        }
        prevWinner.current = winner;
    }, [winner, soundManager]);

    useEffect(() => {
        if (draw && !prevDraw.current) {
            soundManager.play("draw");
            setStatusFlash("draw");
        } else if (!draw && prevDraw.current) {
            setStatusFlash(null);
        }
        prevDraw.current = draw;
    }, [draw, soundManager]);

    useEffect(() => {
        if (!statusFlash) return;
        const timeout = window.setTimeout(
            () => setStatusFlash(null),
            statusFlash === "goal" ? 1400 : 1600
        );
        return () => window.clearTimeout(timeout);
    }, [statusFlash]);

    const goalInfo = useMemo(() => {
        const opponentLabel = mode === "computer" ? "Bramka komputera" : "Bramka gracza B";
        const playerLabel = mode === "computer" ? "Twoja bramka" : "Bramka gracza A";

        if (orientation === "playerBottom") {
            return {
                opponent: {
                    label: opponentLabel,
                    color: "#dc2626",
                    arrow: "^" as const,
                    arrowPlacement: "prefix" as const,
                    positionLabel: "Górna bramka",
                },
                player: {
                    label: playerLabel,
                    color: "#2563eb",
                    arrow: "v" as const,
                    arrowPlacement: "suffix" as const,
                    positionLabel: "Dolna bramka",
                },
            };
        }

        return {
            opponent: {
                label: opponentLabel,
                color: "#dc2626",
                arrow: "v" as const,
                arrowPlacement: "suffix" as const,
                positionLabel: "Dolna bramka",
            },
            player: {
                label: playerLabel,
                color: "#2563eb",
                arrow: "^" as const,
                arrowPlacement: "prefix" as const,
                positionLabel: "Górna bramka",
            },
        };
    }, [mode, orientation]);

    const topGoal = orientation === "playerBottom" ? goalInfo.opponent : goalInfo.player;
    const bottomGoal = orientation === "playerBottom" ? goalInfo.player : goalInfo.opponent;
    const topLabelDisplay: GoalLabelDisplay = { text: topGoal.label, color: topGoal.color };
    const bottomLabelDisplay: GoalLabelDisplay = { text: bottomGoal.label, color: bottomGoal.color };
    const lastMove = history.length > 0 ? history[history.length - 1] : undefined;
    const statusFlashClass =
        statusFlash === "goal"
            ? "status-flash-goal ring-4 ring-amber-400/60"
            : statusFlash === "draw"
                ? "status-flash-draw ring-4 ring-cyan-400/60"
                : "";
    const statusClassName = `text-lg font-semibold px-3 py-2 rounded-2xl bg-white/10 text-emerald-50 shadow-inner status-panel ${statusFlashClass}`;

    const status = useMemo(() => {
        if (draw) {
            return mode === "computer"
                ? "Remis – żadna ze stron nie może wykonać ruchu."
                : "Remis – brak możliwych ruchów.";
        }
        if (winner !== null) {
            if (mode === "computer") {
                return winner === 0 ? "Gol! Wygrywasz!" : "Gol! Komputer wygrywa.";
            }
            return `Gol! Wygrywa gracz ${winner === 0 ? "A" : "B"}`;
        }
        if (blockedLoser !== null) {
            if (mode === "computer") {
                return blockedLoser === 0 ? "Brak ruchów – komputer zwycięża." : "Brak ruchów – komputer przegrywa!";
            }
            return `Brak ruchów – przegrywa gracz ${blockedLoser === 0 ? "A" : "B"}`;
        }
        const base =
            mode === "computer"
                ? current === 0
                    ? "Twoja tura"
                    : "Tura: komputer"
                : `Tura: gracz ${current === 0 ? "A" : "B"}`;
        return base + (extraTurn ? " (odbicie – dodatkowy ruch)" : "");
    }, [draw, mode, winner, blockedLoser, current, extraTurn]);

    const isComputerTurn =
        mode === "computer" &&
        winner === null &&
        blockedLoser === null &&
        !draw &&
        current === 1 &&
        validMoves.length > 0;

    useEffect(() => {
        if (!isComputerTurn) return;

        const delay = difficulty === "easy" ? 650 : difficulty === "hard" ? 320 : 450;

        const timer = window.setTimeout(() => {
            const goalCenter = computeGoalCenter(config.height, config.goalWidth);
            const decision = chooseComputerMove(
                createSimState(pos, edges, current, extraTurn, validMoves, winner, draw),
                config,
                {
                    difficulty,
                    stalemateAsDraw,
                    goalCenter,
                    log: false
                }
            );
            makeMove(decision.move);
        }, delay);

        return () => window.clearTimeout(timer);
    }, [
        isComputerTurn,
        config,
        difficulty,
        stalemateAsDraw,
        mode,
        pos,
        edges,
        current,
        extraTurn,
        validMoves,
        winner,
        draw,
        makeMove
    ]);

    const onChoose = (p: Pos) => {
        if (winner !== null || draw) return;
        if (mode === "computer" && current === 1) return;
        makeMove(p);
    };

    const handleModeChange = (value: "human" | "computer") => {
        if (value === mode) return;
        setMode(value);
        reset();
    };

    const handleBoardSizeChange = (value: BoardSizeOption) => {
        if (value === boardSize) return;
        const preset = BOARD_PRESETS[value];
        setBoardSize(value);
        setConfig({
            width: preset.width,
            height: preset.height,
            goalWidth: defaultGoalWidth()
        });
        setPendingReset(true);
    };

    const handleDifficultyChange = (value: DifficultyLevel) => {
        if (value === difficulty) return;
        setDifficulty(value);
        if (mode === "computer") reset();
    };

    const difficultyLabels: Record<DifficultyLevel, string> = {
        easy: "łatwy",
        normal: "standard",
        hard: "trudny"
    };

    const aiControlsDisabled = mode !== "computer";

    return (
        <div className="w-full max-w-5xl mx-auto p-4 space-y-4 bg-emerald-900/40 border border-emerald-700/60 rounded-3xl shadow-xl backdrop-blur">
            <div className="text-center">
                <h1 className="text-2xl font-bold">Paper Soccer prototype</h1>
                <p className="text-sm text-emerald-200/80">by Zbigniew Kalinowski</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-2 items-start lg:items-end">
                <div className="flex flex-col gap-2 w-full">
                      <label className="flex flex-col text-sm">
                          Rozmiar boiska
                          <select
                              value={boardSize}
                              onChange={(e) => handleBoardSizeChange(e.target.value as BoardSizeOption)}
                              className="border rounded px-2 py-1"
                          >
                              {Object.entries(BOARD_PRESETS).map(([key, preset]) => (
                                  <option key={key} value={key}>
                                      {preset.label}
                                  </option>
                              ))}
                          </select>
                      </label>
                      <label className="flex flex-col text-sm">
                          Układ bramek
                          <select
                              value={orientation}
                              onChange={(e) => setOrientation(e.target.value as OrientationOption)}
                              className="border rounded px-2 py-1"
                          >
                              <option value="playerBottom">Twoja bramka na dole</option>
                              <option value="playerTop">Twoja bramka na górze</option>
                          </select>
                      </label>
                </div>

                <div className="flex flex-col gap-2 w-full lg:w-auto lg:ml-auto">
                    <div className="border rounded-2xl px-3 py-2 text-sm">
                        <span className="font-semibold block mb-1">Tryb gry</span>
                        <label className="flex items-center gap-2 mb-1">
                            <input
                                type="radio"
                                name="game-mode"
                                value="human"
                                checked={mode === "human"}
                                onChange={() => handleModeChange("human")}
                            />
                            Dwóch graczy
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="game-mode"
                                value="computer"
                                checked={mode === "computer"}
                                onChange={() => handleModeChange("computer")}
                            />
                            Z komputerem
                        </label>
                    </div>

                    <div className="border rounded-2xl px-3 py-2 text-sm space-y-2">
                        <span className="font-semibold block">Ustawienia AI</span>
                        <label className="flex flex-col gap-1">
                            <span>Poziom trudności</span>
                            <select
                                value={difficulty}
                                onChange={(e) => handleDifficultyChange(e.target.value as DifficultyLevel)}
                                className="border rounded px-2 py-1"
                                disabled={aiControlsDisabled}
                            >
                                {(Object.entries(difficultyLabels) as Array<[DifficultyLevel, string]>).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>
                        </label>
                    </div>

                    <div className="flex items-center gap-2 p-2">
                        <button
                            onClick={reset}
                            className="rounded-2xl px-4 py-2 shadow font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200 transition-colors"
                            style={{
                                backgroundColor: "#ef4444",
                                color: "#ffffff",
                            }}
                            onMouseEnter={(event) => {
                                event.currentTarget.style.backgroundColor = "#f87171";
                            }}
                            onMouseLeave={(event) => {
                                event.currentTarget.style.backgroundColor = "#ef4444";
                            }}
                            onMouseDown={(event) => {
                                event.currentTarget.style.backgroundColor = "#dc2626";
                            }}
                            onMouseUp={(event) => {
                                event.currentTarget.style.backgroundColor = "#f87171";
                            }}
                        >
                            Nowa gra
                        </button>
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className="rounded-2xl px-4 py-2 shadow font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-200 transition-colors"
                            style={{
                                backgroundColor: soundEnabled ? "#3b82f6" : "#6b7280",
                                color: "#ffffff",
                            }}
                        >
                            {soundEnabled ? "Dźwięk WŁ" : "Dźwięk WYŁ"}
                        </button>
                    </div>
                </div>
            </div>

            <div className={statusClassName}>
                {status}
            </div>

            <BoardSVG
                W={config.width}
                H={config.height}
                goal={config.goalWidth}
                edges={edges}
                pos={pos}
                validMoves={validMoves}
                onChoose={onChoose}
                orientation={orientation}
                topLabel={topLabelDisplay}
                bottomLabel={bottomLabelDisplay}
                lastMove={lastMove}
            />

            <div className="p-4 rounded-2xl border text-sm">
                <h2 className="font-semibold mb-2">Historia ruchów ({history.length})</h2>
                <ol className="list-decimal pl-5 space-y-1 max-h-48 overflow-auto">
                    {history.map((m, i) => (
                        <li key={i}>
                            ({m.from.x},{m.from.y}) → ({m.to.x},{m.to.y})
                        </li>
                    ))}
                </ol>
            </div>
        </div>
    );
}