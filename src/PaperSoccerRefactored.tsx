import { useMemo, useState, useEffect } from "react";
import { GameEngine, DEFAULT_CONFIG } from "@paper-soccer/core/dist/index.js";
import type { GameConfig, Pos, Move } from "@paper-soccer/core/dist/index.js";

// ======= Komponent refaktoryzowany =======

function useGameEngine(config: GameConfig) {
    const [engine] = useState(() => new GameEngine(config));
    const [state, setState] = useState(() => engine.getState());

    // Aktualizuj stan gdy konfiguracja się zmienia
    useEffect(() => {
        engine.updateConfig(config);
        setState(engine.getState());
    }, [engine, config]);

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

// ======= Rysowanie (SVG) =======
const PADDING = 24;
const CELL = 48; // px na kratkę

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
    const width = W * CELL + 2 * PADDING;
    const height = H * CELL + 2 * PADDING;

    const toXY = (p: Pos) => ({
        cx: PADDING + p.x * CELL,
        cy: PADDING + p.y * CELL,
    });

    // Funkcja pomocnicza do rysowania linii odcinka po kluczu
    const parseKey = (k: string): [Pos, Pos] => {
        const [a, b] = k.split("|");
        const [ax, ay] = a.split(",").map(Number);
        const [bx, by] = b.split(",").map(Number);
        return [{ x: ax, y: ay }, { x: bx, y: by }];
    };

    // Funkcja do obliczania zakresu Y dla bramki
    const goalYRange = (height: number, goalWidth: number): number[] => {
        const mid = Math.floor(height / 2);
        const a = Math.max(1, mid - Math.floor(goalWidth / 2) + (goalWidth % 2 === 0 ? 0 : 1));
        const b = Math.min(height - 1, mid + Math.ceil(goalWidth / 2));
        const arr: number[] = [];
        for (let y = a; y <= b; y++) arr.push(y);
        return arr;
    };

    const ysGoal = goalYRange(H, goal);

    // Rysowanie granicy boiska z przerwami (bramki)
    const borderSegments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    // Góra i dół – ciągłe linie
    borderSegments.push({ x1: 0, y1: 0, x2: W, y2: 0 });
    borderSegments.push({ x1: 0, y1: H, x2: W, y2: H });

    // Składamy pionowe segmenty w długie odcinki
    function buildVerticalRuns(x: number, blocked: number[]) {
        const runs: Array<{ y1: number; y2: number }> = [];
        let runStart: number | null = null;
        for (let y = 0; y < H; y++) {
            const isBlockedEdge = blocked.includes(y);
            if (!isBlockedEdge) {
                if (runStart === null) runStart = y;
            }
            if (isBlockedEdge || y === H - 1) {
                const endY = isBlockedEdge ? y : y + 1;
                if (runStart !== null && endY > runStart) runs.push({ y1: runStart, y2: endY });
                runStart = null;
            }
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
                        return <circle key={`pt-${x}-${y}`} cx={cx} cy={cy} r={3} />;
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
                            strokeWidth={3}
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
                            strokeWidth={5}
                            stroke="black"
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Piłka */}
                {(() => {
                    const { cx, cy } = toXY(pos);
                    return (
                        <g>
                            <circle cx={cx} cy={cy} r={9} fill="black" />
                            <circle cx={cx} cy={cy} r={7} fill="white" />
                            <circle cx={cx} cy={cy} r={3} fill="black" />
                        </g>
                    );
                })()}

                {/* Podświetlenie możliwych ruchów */}
                {validMoves.map((p, i) => {
                    const { cx, cy } = toXY(p);
                    return (
                        <g key={`mv-${i}`} onClick={() => onChoose(p)} className="cursor-pointer">
                            <circle cx={cx} cy={cy} r={10} fill="rgba(0,0,0,0.06)" />
                            <circle cx={cx} cy={cy} r={4} fill="rgba(0,0,0,0.7)" />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

export default function PaperSoccerRefactored() {
    const [config, setConfig] = useState<GameConfig>(() => ({ ...DEFAULT_CONFIG }));
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
    } = useGameEngine(config);

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
            <h1 className="text-2xl font-bold">Piłka na kartce – refaktoryzowana wersja</h1>

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
                                width: Math.max(6, Math.min(30, Number(e.target.value) || DEFAULT_CONFIG.width))
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
                                height: Math.max(6, Math.min(30, Number(e.target.value) || DEFAULT_CONFIG.height))
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
                                goalWidth: Math.max(1, Math.min(Math.floor(prev.height / 2), Number(e.target.value) || DEFAULT_CONFIG.goalWidth))
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

            <DetailsPanel
                W={config.width}
                H={config.height}
                goal={config.goalWidth}
                history={history}
            />

            <NextSteps />
        </div>
    );
}

function DetailsPanel({ W, H, goal, history }: { W: number; H: number; goal: number; history: Move[]; }) {
    return (
        <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-2xl border">
                <h2 className="font-semibold mb-2">Parametry boiska</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Rozmiar: {W} × {H} kratek</li>
                    <li>Bramka: {goal} kratki</li>
                    <li>Pozycja startowa piłki: ({Math.floor(W / 2)}, {Math.floor(H / 2)})</li>
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
    );
}

function NextSteps() {
    return (
        <div className="p-4 rounded-2xl border space-y-3">
            <h2 className="font-semibold">Co dalej (plan do wersji mobilnej i sprzedaży)</h2>
            <ol className="list-decimal pl-5 space-y-2">
                <li><span className="font-medium">✅ Refaktor silnika gry</span>: wydziel logikę (walidacja ruchów, odbicia, gol, blokada) do osobnego pakietu TypeScript (np. <code>packages/core</code>) – łatwo użyjesz w web (React) i mobilnie (React Native/Expo).</li>
                <li><span className="font-medium">UX</span>: animacja ruchu piłki, podświetlenie legalnych kierunków, dźwięk odbicia/gola, skróty klawiszowe.</li>
                <li><span className="font-medium">Tryby gry</span>: lokalny 2‑osobowy (jest), solo vs. bot (prosty heurystyczny + później MCTS), online (WebRTC/WebSockets).</li>
                <li><span className="font-medium">Zapis/udostępnianie</span>: eksport/udostępnianie powtórek, kod pokoju, statystyki, rankingi.</li>
                <li><span className="font-medium">Mobilnie (Expo/React Native)</span>: to samo UI w RN (SVG: <code>react-native-svg</code>), haptics, tryb pion/poziom, rozgrywki asynchroniczne (turn‑based) z powiadomieniami.</li>
                <li><span className="font-medium">Monetyzacja</span>: tryb premium (motywy, większe boiska, bot Pro), reklamy nagradzane, DLC z planszami; wersja web jako demo, pełna na sklepy.</li>
                <li><span className="font-medium">Technikalia</span>: build web (Vite) + mobil (Expo) z jednym monorepo (pnpm/Turbo), CI/CD, analityka (PL/GDPR), crash reporting.</li>
                <li><span className="font-medium">Testy</span>: E2E (Playwright) – scenariusze odbić, blokad, goli; unit (Jest/Vitest) dla silnika; property‑based dla generowania ruchów.</li>
                <li><span className="font-medium">AI‑bot – prosta heurystyka</span>: maksymalizuj zbliżenie do bramki przeciwnika, unikaj zamknięć; później drzewo Monte Carlo.</li>
            </ol>
        </div>
    );
}
