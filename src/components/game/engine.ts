import { KIND_COUNT } from "./DinoTiles";

export const ROWS = 8;
export const COLS = 8;
export const CELLS = ROWS * COLS;

export type Board = (number | null)[];

export const idx = (r: number, c: number) => r * COLS + c;
export const rowOf = (i: number) => Math.floor(i / COLS);
export const colOf = (i: number) => i % COLS;

const randKind = () => Math.floor(Math.random() * KIND_COUNT);

export function isAdjacent(a: number, b: number): boolean {
  const dr = Math.abs(rowOf(a) - rowOf(b));
  const dc = Math.abs(colOf(a) - colOf(b));
  return dr + dc === 1;
}

/** All indices that belong to a horizontal or vertical run of 3+ same kind. */
export function findMatches(b: Board): Set<number> {
  const matched = new Set<number>();

  // horizontal runs
  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const cur = c < COLS ? b[idx(r, c)] : null;
      const prev = b[idx(r, c - 1)];
      if (c < COLS && cur !== null && cur === prev) {
        run++;
      } else {
        if (run >= 3) for (let k = c - run; k < c; k++) matched.add(idx(r, k));
        run = 1;
      }
    }
  }

  // vertical runs
  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const cur = r < ROWS ? b[idx(r, c)] : null;
      const prev = b[idx(r - 1, c)];
      if (r < ROWS && cur !== null && cur === prev) {
        run++;
      } else {
        if (run >= 3) for (let k = r - run; k < r; k++) matched.add(idx(k, c));
        run = 1;
      }
    }
  }

  return matched;
}

/** Drop surviving tiles down each column and refill the gaps from the top. */
export function applyGravity(b: Board): Board {
  const nb = b.slice();
  for (let c = 0; c < COLS; c++) {
    const survivors: number[] = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const v = nb[idx(r, c)];
      if (v !== null) survivors.push(v);
    }
    for (let r = ROWS - 1, k = 0; r >= 0; r--, k++) {
      nb[idx(r, c)] = k < survivors.length ? survivors[k] : randKind();
    }
  }
  return nb;
}

/** Is there at least one adjacent swap that creates a match? */
export function hasPossibleMove(b: Board): boolean {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = idx(r, c);
      if (c < COLS - 1) {
        const j = i + 1;
        const t = b.slice();
        [t[i], t[j]] = [t[j], t[i]];
        if (findMatches(t).size > 0) return true;
      }
      if (r < ROWS - 1) {
        const j = i + COLS;
        const t = b.slice();
        [t[i], t[j]] = [t[j], t[i]];
        if (findMatches(t).size > 0) return true;
      }
    }
  }
  return false;
}

/**
 * Deterministic, match-free starter board used for the server render only.
 * It carries no randomness so SSR and the first client render agree (no
 * hydration mismatch); the real randomized board is generated on mount.
 */
export function initialBoard(): Board {
  const b: Board = new Array(CELLS).fill(0);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      b[idx(r, c)] = (r + c) % KIND_COUNT;
    }
  }
  return b;
}

/** Fresh board with no pre-existing matches and at least one legal move. */
export function createBoard(): Board {
  let b: Board;
  do {
    b = new Array(CELLS).fill(0);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const banned = new Set<number>();
        if (c >= 2 && b[idx(r, c - 1)] === b[idx(r, c - 2)]) banned.add(b[idx(r, c - 1)] as number);
        if (r >= 2 && b[idx(r - 1, c)] === b[idx(r - 2, c)]) banned.add(b[idx(r - 1, c)] as number);
        let kind = randKind();
        while (banned.has(kind)) kind = randKind();
        b[idx(r, c)] = kind;
      }
    }
  } while (findMatches(b).size > 0 || !hasPossibleMove(b));
  return b;
}

/** Shuffle existing tiles into a fresh, playable arrangement (no free matches). */
export function reshuffle(b: Board): Board {
  let arr: Board;
  do {
    arr = b.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } while (findMatches(arr).size > 0 || !hasPossibleMove(arr));
  return arr;
}
