import { useMemo, useState } from "react";

// Paper Soccer (Piłka na kartce w kratkę)
// Zasady zaimplementowane wg Twojego opisu:
// - Ruch po wierzchołkach krat (poziomo/pionowo/po skosie) o długości 1 krawędzi
// - Nie wolno rysować po już istniejących odcinkach
// - Nie wolno poruszać się wzdłuż brzegów boiska
// - Odbicie: jeśli ruch kończy się na brzegu LUB w punkcie, przez który przechodzi już jakaś linia (sprzed ruchu), gracz dostaje dodatkowy ruch
// - Gol: gdy piłka dotknie brzegu w obszarze bramki (x==0 lub x==W) na dozwolonych współrzędnych Y
// - Tury na zmianę; po odbiciu turę kontynuuje ten sam gracz
// - Blokada: jeśli gracz nie ma ruchu – przegrywa

// ======= Ustawienia domyślne =======
const DEFAULT_W = 10; // liczba kratek w poziomie
const DEFAULT_H = 8;  // liczba kratek w pionie
const DEFAULT_GOAL = 2; // szerokość bramki (w kratkach)

// ======= Typy =======
type Pos = { x: number; y: number };
type Move = { from: Pos; to: Pos };

function keyEdge(a: Pos, b: Pos) {
    // klucz bezkierunkowy dla odcinka (a-b)
    const k1 = `${a.x},${a.y}`;
    const k2 = `${b.x},${b.y}`;
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
}

function isAdj(a: Pos, b: Pos) {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (dx === 0 && dy === 0) return false;
    return dx <= 1 && dy <= 1; // poziomo/pionowo/po skosie, max 1 kratka
}

function isBoundary(p: Pos, W: number, H: number) {
    return p.x === 0 || p.x === W || p.y === 0 || p.y === H;
}

function inBounds(p: Pos, W: number, H: number) {
    return p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H;
}

function isBorderEdge(a: Pos, b: Pos, W: number, H: number) {
    // Zakaz ruchu WZDŁUŻ brzegu.
    // Odcinek leży na brzegu, jeśli oba końce są na tym samym brzegu i odcinek jest poziomy/wyprostowany.
    if (a.y === 0 && b.y === 0) return true; // górna krawędź
    if (a.y === H && b.y === H) return true; // dolna krawędź
    if (a.x === 0 && b.x === 0) return true; // lewa krawędź
    if (a.x === W && b.x === W) return true; // prawa krawędź
    return false;
}

function centerPos(W: number, H: number): Pos {
    return { x: Math.floor(W / 2), y: Math.floor(H / 2) };
}

function goalYRange(H: number, goal: number): number[] {
    // bramka centrowana na środku wysokości, szeroka na `goal` kratek (liczba segmentów)
    const mid = Math.floor(H / 2);

    // Dla idealnego centrowania:
    // - Jeśli goal jest nieparzysty: centrum na mid, po (goal-1)/2 w każdą stronę
    // - Jeśli goal jest parzysty: centrum między mid-0.5 i mid+0.5, po goal/2 w każdą stronę
    let start, end;

    if (goal % 2 === 1) {
        // Nieparzysty goal: centrum na mid
        const half = Math.floor(goal / 2);
        start = mid - half;
        end = mid + half;
    } else {
        // Parzysty goal: centrum między mid-0.5 i mid+0.5
        const half = goal / 2;
        start = mid - half;
        end = mid + half - 1;
    }

    // Upewnij się, że bramka nie wychodzi poza granice boiska
    start = Math.max(1, start);
    end = Math.min(H - 1, end);

    const arr: number[] = [];
    for (let y = start; y <= end; y++) arr.push(y);
    return arr;
}

function incidentDegree(p: Pos, edges: Set<string>, W: number, H: number) {
    // Liczba istniejących odcinków stykających się z wierzchołkiem p
    let deg = 0;
    const dirs = [
        { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
        { dx: -1, dy: 0 }, /*self*/            { dx: 1, dy: 0 },
        { dx: -1, dy: 1 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 },
    ];
    for (const d of dirs) {
        const q = { x: p.x + d.dx, y: p.y + d.dy };
        if (!inBounds(q, W, H)) continue;
        if (d.dx === 0 && d.dy === 0) continue;
        if (edges.has(keyEdge(p, q))) deg++;
    }
    return deg;
}

function computeValidMoves(pos: Pos, edges: Set<string>, W: number, H: number) {
    const candidates: Pos[] = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const q = { x: pos.x + dx, y: pos.y + dy };
            if (!inBounds(q, W, H)) continue;
            if (isBorderEdge(pos, q, W, H)) continue; // zakaz ruchu wzdłuż brzegów
            const k = keyEdge(pos, q);
            if (edges.has(k)) continue; // zakaz ponownego użycia odcinka
            candidates.push(q);
        }
    }
    return candidates;
}

function willBounce(target: Pos, edges: Set<string>, W: number, H: number) {
    // Odbicie jeśli: target jest na brzegu LUB stopień (NA BAZIE ISTNIEJĄCYCH krawędzi, PRZED dodaniem nowej) >= 1
    if (isBoundary(target, W, H)) return true;
    const deg = incidentDegree(target, edges, W, H);
    return deg >= 1;
}

function isGoal(p: Pos, W: number, H: number, goal: number) {
    const ys = goalYRange(H, goal);
    if (p.x === 0 && ys.includes(p.y)) return { side: "LEFT" as const };
    if (p.x === W && ys.includes(p.y)) return { side: "RIGHT" as const };
    return null;
}

function clonePos(p: Pos): Pos { return { x: p.x, y: p.y }; }

function simulateHistory(W: number, H: number, goal: number, history: Move[]) {
    const edges = new Set<string>();
    let pos = centerPos(W, H);
    let current = 0; // 0 = Gracz A, 1 = Gracz B
    let winner: 0 | 1 | null = null;
    let extraTurn = false;

    for (const m of history) {
        const fromOK = m.from.x === pos.x && m.from.y === pos.y;
        const toOK = inBounds(m.to, W, H) && isAdj(m.from, m.to) && !isBorderEdge(m.from, m.to, W, H) && !edges.has(keyEdge(m.from, m.to));
        if (!fromOK || !toOK) {
            // jeśli historia jest niepoprawna, przerwij i zignoruj resztę
            break;
        }
        const k = keyEdge(m.from, m.to);
        const bounce = willBounce(m.to, edges, W, H);

        edges.add(k);
        pos = clonePos(m.to);

        // Gol?
        const g = isGoal(pos, W, H, goal);
        if (g) {
            winner = current as 0 | 1; // strzelił ten, kto wykonał ruch
            extraTurn = false;
            break;
        }

        if (bounce) {
            extraTurn = true; // ten sam gracz gra dalej
        } else {
            current = (current ^ 1) as 0 | 1;
            extraTurn = false;
        }
    }

    // Jeśli brak zwycięzcy, sprawdź dostępne ruchy z aktualnej pozycji
    const valid = winner === null ? computeValidMoves(pos, edges, W, H) : [];
    let blockedLoser: 0 | 1 | null = null;
    if (winner === null && valid.length === 0) {
        // brak ruchów – przegrywa gracz, który ma wykonać ruch (czyli 'current')
        blockedLoser = current as 0 | 1;
    }

    return { edges, pos, current, extraTurn, winner, blockedLoser, validMoves: valid } as const;
}

function useBoardState(W: number, H: number, goal: number) {
    const [history, setHistory] = useState<Move[]>([]);

    const state = useMemo(() => simulateHistory(W, H, goal, history), [W, H, goal, history]);

    const makeMove = (to: Pos) => {
        if (state.winner !== null) return;
        const from = state.pos;
        const k = keyEdge(from, to);
        const can = inBounds(to, W, H) && isAdj(from, to) && !isBorderEdge(from, to, W, H) && !state.edges.has(k);
        if (!can) return;
        setHistory((h) => [...h, { from, to }]);
    };

    const undo = () => {
        setHistory((h) => h.slice(0, -1));
    };

    const reset = () => setHistory([]);

    return { ...state, history, makeMove, undo, reset, setHistory } as const;
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

    const ysGoal = goalYRange(H, goal);

    // Funkcja pomocnicza do rysowania linii odcinka po kluczu
    const parseKey = (k: string): [Pos, Pos] => {
        const [a, b] = k.split("|");
        const [ax, ay] = a.split(",").map(Number);
        const [bx, by] = b.split(",").map(Number);
        return [{ x: ax, y: ay }, { x: bx, y: by }];
    };

    // Rysowanie granicy boiska z przerwami (bramki)
    const borderSegments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    // Góra i dół – ciągłe linie
    borderSegments.push({ x1: 0, y1: 0, x2: W, y2: 0 });
    borderSegments.push({ x1: 0, y1: H, x2: W, y2: H });
    // Lewa / Prawa – z przerwą na bramkę
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
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white rounded-2xl shadow p-1 select-none">
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

export default function PaperSoccer() {
    const [W, setW] = useState<number>(DEFAULT_W);
    const [H, setH] = useState<number>(DEFAULT_H);
    const [goal, setGoal] = useState<number>(DEFAULT_GOAL);
    const { edges, pos, current, extraTurn, winner, blockedLoser, validMoves, history, makeMove, undo, reset } = useBoardState(W, H, goal);

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
            <h1 className="text-2xl font-bold">Piłka na kartce – prototyp</h1>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex flex-col text-sm">Szerokość (W)
                        <input type="number" min={6} max={30} value={W} onChange={(e) => setW(Math.max(6, Math.min(30, Number(e.target.value) || DEFAULT_W)))} className="border rounded px-2 py-1" />
                    </label>
                    <label className="flex flex-col text-sm">Wysokość (H)
                        <input type="number" min={6} max={30} value={H} onChange={(e) => setH(Math.max(6, Math.min(30, Number(e.target.value) || DEFAULT_H)))} className="border rounded px-2 py-1" />
                    </label>
                    <label className="flex flex-col text-sm">Szer. bramki
                        <input type="number" min={1} max={Math.max(1, Math.floor(H / 2))} value={goal} onChange={(e) => setGoal(Math.max(1, Math.min(Math.floor(H / 2), Number(e.target.value) || DEFAULT_GOAL)))} className="border rounded px-2 py-1" />
                    </label>
                    <button onClick={restartWithGeometry} className="col-span-3 bg-black text-white rounded-2xl px-3 py-2 shadow">Zastosuj i zresetuj</button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    <button onClick={undo} className="border rounded-2xl px-3 py-2 shadow">Cofnij ruch</button>
                    <button onClick={reset} className="border rounded-2xl px-3 py-2 shadow">Nowa gra</button>
                </div>
            </div>

            <div className="text-lg font-medium">{status}</div>

            <BoardSVG W={W} H={H} goal={goal} edges={edges} pos={pos} validMoves={validMoves} onChoose={onChoose} />

            <DetailsPanel W={W} H={H} goal={goal} history={history} />

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
                <li><span className="font-medium">Refaktor silnika gry</span>: wydziel logikę (walidacja ruchów, odbicia, gol, blokada) do osobnego pakietu TypeScript (np. <code>packages/core</code>) – łatwo użyjesz w web (React) i mobilnie (React Native/Expo).</li>
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
