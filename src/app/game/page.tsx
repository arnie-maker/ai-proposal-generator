"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DINO_KINDS, DinoTile } from "@/components/game/DinoTiles";
import {
  applyGravity,
  Board,
  COLS,
  createBoard,
  findMatches,
  hasPossibleMove,
  initialBoard,
  isAdjacent,
  reshuffle,
} from "@/components/game/engine";

const TARGET = 1500;
const START_MOVES = 25;

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

export default function GamePage() {
  // Server renders the deterministic starter board; the randomized board is
  // generated on mount so SSR and hydration agree.
  const [board, setBoard] = useState<Board>(initialBoard);
  const [selected, setSelected] = useState<number | null>(null);
  const [clearing, setClearing] = useState<Set<number>>(new Set());
  const [invalid, setInvalid] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(START_MOVES);
  const [combo, setCombo] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const busy = useRef(false);

  const restart = useCallback(() => {
    busy.current = false;
    setBoard(createBoard());
    setSelected(null);
    setClearing(new Set());
    setInvalid(null);
    setScore(0);
    setMoves(START_MOVES);
    setCombo(0);
    setStatus("playing");
  }, []);

  // Swap the deterministic SSR board for a real randomized one after mount.
  useEffect(() => {
    setBoard(createBoard());
  }, []);

  // Win / lose detection once the board settles.
  useEffect(() => {
    if (status !== "playing" || busy.current) return;
    if (score >= TARGET) setStatus("won");
    else if (moves <= 0) setStatus("lost");
  }, [score, moves, status]);

  const resolveBoard = useCallback(async (start: Board): Promise<Board> => {
    let cur = start.slice();
    let chain = 0;
    // Cascade until the board is stable.
    while (true) {
      const matches = findMatches(cur);
      if (matches.size === 0) break;
      chain++;
      setCombo(chain);
      setScore((s) => s + matches.size * 10 * chain);
      setClearing(new Set(matches));
      await delay(260);
      for (const i of matches) cur[i] = null;
      cur = applyGravity(cur);
      setClearing(new Set());
      setBoard(cur.slice());
      await delay(230);
    }
    // Guarantee the player always has a move.
    if (!hasPossibleMove(cur)) {
      cur = reshuffle(cur);
      setBoard(cur.slice());
      await delay(230);
    }
    setCombo(0);
    return cur;
  }, []);

  const trySwap = useCallback(
    async (a: number, b: number) => {
      if (busy.current) return;
      const swapped = board.slice();
      [swapped[a], swapped[b]] = [swapped[b], swapped[a]];

      if (findMatches(swapped).size === 0) {
        // Illegal swap — nudge it and bounce back.
        busy.current = true;
        setInvalid([a, b]);
        await delay(300);
        setInvalid(null);
        busy.current = false;
        return;
      }

      busy.current = true;
      setMoves((m) => m - 1);
      setBoard(swapped);
      await delay(160);
      await resolveBoard(swapped);
      busy.current = false;
    },
    [board, resolveBoard],
  );

  const handleClick = useCallback(
    (i: number) => {
      if (busy.current || status !== "playing") return;
      if (selected === null) {
        setSelected(i);
        return;
      }
      if (selected === i) {
        setSelected(null);
        return;
      }
      if (isAdjacent(selected, i)) {
        const from = selected;
        setSelected(null);
        void trySwap(from, i);
      } else {
        setSelected(i);
      }
    },
    [busy, selected, status, trySwap],
  );

  const progress = Math.min(100, Math.round((score / TARGET) * 100));

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🦖</span>
          <h1 className="text-3xl font-semibold gradient-text">Dino Crush</h1>
        </div>
        <p className="text-text-secondary text-sm">
          귀여운 공룡 얼굴, 알, 발톱을 3개 이상 맞춰 터뜨리세요! 같은 종류를 옆 칸과 바꿔 연결하면 점수가 쌓입니다.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
        {/* Board */}
        <div className="glass p-3 sm:p-4 relative">
          <div
            className="grid gap-1 sm:gap-1.5 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              maxWidth: 520,
            }}
          >
            {board.map((kind, i) => {
              const isSel = selected === i;
              const isClearing = clearing.has(i);
              const isInvalid = invalid?.includes(i) ?? false;
              return (
                <button
                  key={i}
                  onClick={() => handleClick(i)}
                  disabled={status !== "playing"}
                  aria-label={kind === null ? "empty" : DINO_KINDS[kind].label}
                  className={[
                    "relative aspect-square rounded-xl transition-transform duration-150 select-none",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                    isSel ? "scale-95 z-10 dino-selected" : "hover:scale-[1.06] active:scale-95",
                    isClearing ? "dino-clear" : "",
                    isInvalid ? "dino-shake" : "",
                  ].join(" ")}
                  style={{
                    boxShadow: isSel
                      ? `0 0 0 3px #fff, 0 0 18px ${kind !== null ? DINO_KINDS[kind].glow : "#fff"}`
                      : undefined,
                  }}
                >
                  {kind !== null && (
                    <span className="dino-pop block w-full h-full" key={`${i}-${kind}`}>
                      <DinoTile kind={kind} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Game over overlay */}
          {status !== "playing" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-dark-900/80 backdrop-blur-sm z-20">
              <div className="glass p-8 text-center max-w-xs">
                <div className="text-5xl mb-3">{status === "won" ? "🎉🦕" : "🌋🦖"}</div>
                <h2 className="text-2xl font-semibold mb-1 gradient-text">
                  {status === "won" ? "클리어!" : "게임 오버"}
                </h2>
                <p className="text-text-secondary text-sm mb-1">
                  {status === "won"
                    ? "목표 점수를 달성했어요!"
                    : "이동 횟수를 모두 사용했어요."}
                </p>
                <p className="text-lg font-semibold mb-5">
                  최종 점수: <span className="gradient-text">{score.toLocaleString()}</span>
                </p>
                <button className="btn-gradient" onClick={restart}>
                  다시 하기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* HUD */}
        <aside className="glass p-5 w-full md:w-56 flex flex-col gap-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-text-secondary mb-1">점수</p>
            <p className="text-3xl font-bold gradient-text tabular-nums">{score.toLocaleString()}</p>
            <div className="mt-2 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full btn-gradient transition-all duration-300"
                style={{ width: `${progress}%`, padding: 0, borderRadius: 0 }}
              />
            </div>
            <p className="text-[11px] text-text-secondary mt-1">목표 {TARGET.toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass p-3 text-center">
              <p className="text-xs text-text-secondary mb-1">이동</p>
              <p className={`text-2xl font-bold tabular-nums ${moves <= 5 ? "text-rose-400" : ""}`}>
                {moves}
              </p>
            </div>
            <div className="glass p-3 text-center">
              <p className="text-xs text-text-secondary mb-1">콤보</p>
              <p className="text-2xl font-bold tabular-nums">{combo > 1 ? `x${combo}` : "—"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-text-secondary mb-2">공룡 도감</p>
            <div className="grid grid-cols-3 gap-2">
              {DINO_KINDS.map((k, i) => (
                <div key={k.id} className="aspect-square" title={k.label}>
                  <DinoTile kind={i} />
                </div>
              ))}
            </div>
          </div>

          <button
            className="text-sm text-text-secondary hover:text-text-primary transition-colors py-2 rounded-lg hover:bg-white/[0.03]"
            onClick={restart}
          >
            ↻ 새 게임
          </button>
        </aside>
      </div>
    </div>
  );
}
