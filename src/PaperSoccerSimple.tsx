import { useMemo, useState, useEffect } from "react";

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
};

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
function useSimpleGameEngine(config: GameConfig) {
    const [history, setHistory] = useState<Move[]>([]);
    const [state, setState] = useState<GameState>(() => {
        const pos = centerPosition(config.width, config.height);
        const edges = new Set<string>();
        const validMoves = computeValidMoves(pos, edges, config.width, config.height);
        return {
            edges,
            pos,
            current: 0,
            extraTurn: false,
            winner: null,
            blockedLoser: null,
            validMoves
        };
    });

    const makeMove = (to: Pos) => {
        if (state.winner !== null) return;

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
            setState({
                edges: newEdges,
                pos: newPos,
                current: state.current,
                extraTurn: false,
                winner: state.current,
                blockedLoser: null,
                validMoves: []
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

        // Sprawdź blokadę
        let newBlockedLoser: Player | null = null;
        if (newValidMoves.length === 0) {
            newBlockedLoser = newCurrent;
        }

        setState({
            edges: newEdges,
            pos: newPos,
            current: newCurrent,
            extraTurn: newExtraTurn,
            winner: null,
            blockedLoser: newBlockedLoser,
            validMoves: newValidMoves
        });
        setHistory(newHistory);
    };

    const undo = () => {
        if (history.length === 0) return;

        const newHistory = history.slice(0, -1);
        setHistory(newHistory);

        // Przelicz stan od nowa
        const edges = new Set<string>();
        let pos = centerPosition(config.width, config.height);
        let current: Player = 0;
        let extraTurn = false;

        for (const move of newHistory) {
            const k = keyEdge(move.from, move.to);
            edges.add(k);
            pos = { x: move.to.x, y: move.to.y };

            const bounce = willBounce(move.to, edges, config.width, config.height);
            if (bounce) {
                extraTurn = true;
            } else {
                current = (current ^ 1) as Player;
                extraTurn = false;
            }
        }

        const validMoves = computeValidMoves(pos, edges, config.width, config.height);
        let blockedLoser: Player | null = null;
        if (validMoves.length === 0) {
            blockedLoser = current;
        }

        setState({
            edges,
            pos,
            current,
            extraTurn,
            winner: null,
            blockedLoser,
            validMoves
        });
    };

    const reset = () => {
        setHistory([]);
        const pos = centerPosition(config.width, config.height);
        const edges = new Set<string>();
        const validMoves = computeValidMoves(pos, edges, config.width, config.height);
        setState({
            edges,
            pos,
            current: 0,
            extraTurn: false,
            winner: null,
            blockedLoser: null,
            validMoves
        });
    };

    return {
        ...state,
        makeMove,
        undo,
        reset,
        history
    };
}

// ======= Komponent =======
const PADDING = 24;
const MAX_BOARD_SIZE = 600; // maksymalny rozmiar boiska w px

function BoardSVG({
    W,
    H,
    goal,
    edges,
    pos,
    validMoves,
    onChoose,
}: {
    W: number;
    H: number;
    goal: number;
    edges: Set<string>;
    pos: Pos;
    validMoves: Pos[];
    onChoose: (p: Pos) => void;
}) {
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

    const width = W * cellSize + 2 * PADDING;
    const height = H * cellSize + 2 * PADDING;

    const toXY = (p: Pos) => ({
        cx: PADDING + p.x * cellSize,
        cy: PADDING + p.y * cellSize,
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

    const borderSegments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    borderSegments.push({ x1: 0, y1: 0, x2: W, y2: 0 });
    borderSegments.push({ x1: 0, y1: H, x2: W, y2: H });

    function buildVerticalRuns(x: number, goalYs: number[]) {
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

        return runs.map((r) => ({ x1: x, y1: r.y1, x2: x, y2: r.y2 }));
    }
    borderSegments.push(...buildVerticalRuns(0, ysGoal));
    borderSegments.push(...buildVerticalRuns(W, ysGoal));

    return (
        <div className="w-full flex justify-center">
            <svg width={width} height={height} className="bg-white rounded-2xl shadow p-1 select-none">
                {/* Siatka punktów */}
                {Array.from({ length: H + 1 }, (_, y) => (
                    Array.from({ length: W + 1 }, (_, x) => {
                        const { cx, cy } = toXY({ x, y });
                        return <circle key={`pt-${x}-${y}`} cx={cx} cy={cy} r={Math.max(2, cellSize / 16)} />;
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
                            strokeWidth={Math.max(2, cellSize / 16)}
                            strokeOpacity={0.8}
                            strokeDasharray=""
                            stroke="currentColor"
                        />
                    );
                })}

                {/* Odcinki gry */}
                {Array.from(edges).map((k) => {
                    const [a, b] = parseKey(k);
                    const p1 = toXY(a);
                    const p2 = toXY(b);
                    return (
                        <line
                            key={k}
                            x1={p1.cx}
                            y1={p1.cy}
                            x2={p2.cx}
                            y2={p2.cy}
                            strokeWidth={Math.max(3, cellSize / 10)}
                            stroke="black"
                            strokeLinecap="round"
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
                        <g>
                            <circle cx={cx} cy={cy} r={ballRadius} fill="black" />
                            <circle cx={cx} cy={cy} r={innerRadius} fill="white" />
                            <circle cx={cx} cy={cy} r={centerRadius} fill="black" />
                        </g>
                    );
                })()}

                {/* Podświetlenie możliwych ruchów */}
                {validMoves.map((p, i) => {
                    const { cx, cy } = toXY(p);
                    const highlightRadius = Math.max(8, cellSize / 5);
                    const dotRadius = Math.max(3, cellSize / 12);
                    return (
                        <g key={`mv-${i}`} onClick={() => onChoose(p)} className="cursor-pointer">
                            <circle cx={cx} cy={cy} r={highlightRadius} fill="rgba(0,0,0,0.06)" />
                            <circle cx={cx} cy={cy} r={dotRadius} fill="rgba(0,0,0,0.7)" />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

export default function PaperSoccerSimple() {
    const [config, setConfig] = useState<GameConfig>({ width: 10, height: 8, goalWidth: 2 });
    const {
        edges,
        pos,
        current,
        extraTurn,
        winner,
        blockedLoser,
        validMoves,
        history,
        makeMove,
        undo,
        reset
    } = useSimpleGameEngine(config);

    const status = useMemo(() => {
        if (winner !== null) return `Gol! Wygrywa gracz ${winner === 0 ? "A" : "B"}`;
        if (blockedLoser !== null) return `Brak ruchów – przegrywa gracz ${blockedLoser === 0 ? "A" : "B"}`;
        return `Tura: gracz ${current === 0 ? "A" : "B"}` + (extraTurn ? " (odbicie – dodatkowy ruch)" : "");
    }, [winner, blockedLoser, current, extraTurn]);

    const onChoose = (p: Pos) => {
        makeMove(p);
    };

    const restartWithGeometry = () => {
        reset();
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-6 space-y-4">
            <h1 className="text-2xl font-bold">Piłka na kartce – prosta wersja</h1>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="grid grid-cols-3 gap-3">
                    <label className="flex flex-col text-sm">Szerokość (W)
                        <input
                            type="number"
                            min={6}
                            max={30}
                            value={config.width}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                width: Math.max(6, Math.min(30, Number(e.target.value) || 10))
                            }))}
                            className="border rounded px-2 py-1"
                        />
                    </label>
                    <label className="flex flex-col text-sm">Wysokość (H)
                        <input
                            type="number"
                            min={6}
                            max={30}
                            value={config.height}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                height: Math.max(6, Math.min(30, Number(e.target.value) || 8))
                            }))}
                            className="border rounded px-2 py-1"
                        />
                    </label>
                    <label className="flex flex-col text-sm">Szer. bramki
                        <input
                            type="number"
                            min={1}
                            max={Math.max(1, Math.floor(config.height / 2))}
                            value={config.goalWidth}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                goalWidth: Math.max(1, Math.min(Math.floor(prev.height / 2), Number(e.target.value) || 2))
                            }))}
                            className="border rounded px-2 py-1"
                        />
                    </label>
                    <button
                        onClick={restartWithGeometry}
                        className="col-span-3 bg-black text-white rounded-2xl px-3 py-2 shadow"
                    >
                        Zastosuj i zresetuj
                    </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <button onClick={undo} className="border rounded-2xl px-3 py-2 shadow">Cofnij ruch</button>
                    <button onClick={reset} className="border rounded-2xl px-3 py-2 shadow">Nowa gra</button>
                </div>
            </div>

            <div className="text-lg font-medium">{status}</div>

            <BoardSVG
                W={config.width}
                H={config.height}
                goal={config.goalWidth}
                edges={edges}
                pos={pos}
                validMoves={validMoves}
                onChoose={onChoose}
            />

            <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-2xl border">
                    <h2 className="font-semibold mb-2">Parametry boiska</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Rozmiar: {config.width} × {config.height} kratek</li>
                        <li>Bramka: {config.goalWidth} kratki</li>
                        <li>Pozycja startowa piłki: ({Math.floor(config.width / 2)}, {Math.floor(config.height / 2)})</li>
                        <li>Zakaz ruchu po brzegach, dozwolone odbicia od brzegu i linii.</li>
                    </ul>
                </div>
                <div className="p-4 rounded-2xl border">
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
        </div>
    );
}
