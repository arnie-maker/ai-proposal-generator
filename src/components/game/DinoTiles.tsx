"use client";

/**
 * Cute prehistoric tile art for Dino Crush.
 * Every tile is a rounded, softly-glowing pastel square with a friendly white
 * glyph on top — dino faces, an egg, a claw, a footprint and a bone. Each type
 * owns a distinct hue so matches read instantly, Candy-Crush style.
 */

export type DinoKind = {
  id: string;
  label: string;
  from: string;
  to: string;
  glow: string;
  Glyph: () => React.ReactElement;
};

// --- Glyphs (drawn on a 0 0 100 100 canvas, white with soft shadows) ---

function RexGlyph() {
  return (
    <g>
      {/* head */}
      <path
        d="M28 40c0-13 11-22 24-22 12 0 22 8 24 18 6 1 10 5 10 11 0 7-6 12-14 12H40c-9 0-16-6-16-15 0-1 0-3 4-4z"
        fill="#fff"
      />
      {/* eye whites */}
      <circle cx="44" cy="42" r="7" fill="#0d3b2e" />
      <circle cx="63" cy="42" r="7" fill="#0d3b2e" />
      <circle cx="46" cy="40" r="2.6" fill="#fff" />
      <circle cx="65" cy="40" r="2.6" fill="#fff" />
      {/* nostrils */}
      <circle cx="73" cy="52" r="1.8" fill="#0d3b2e" />
      {/* teeth */}
      <path d="M40 60l4 6 4-6 4 6 4-6 4 6 4-6" fill="none" stroke="#0d3b2e" strokeWidth="2.4" strokeLinejoin="round" />
    </g>
  );
}

function BrontoGlyph() {
  return (
    <g>
      {/* long neck + head */}
      <path
        d="M34 74c0-16 4-30 4-40 0-9 6-16 15-16 8 0 14 5 14 13 0 8-6 12-12 12-4 0-6 3-6 8v23z"
        fill="#fff"
      />
      {/* body hump */}
      <path d="M30 74c0-10 8-16 18-16s18 6 18 16z" fill="#fff" />
      {/* eye */}
      <circle cx="52" cy="30" r="4.2" fill="#0b3a4a" />
      <circle cx="53.5" cy="28.5" r="1.5" fill="#fff" />
      {/* smile */}
      <path d="M58 34c3 1 5 3 5 6" fill="none" stroke="#0b3a4a" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  );
}

function EggGlyph() {
  return (
    <g>
      <path
        d="M50 20c14 0 24 20 24 34s-11 24-24 24-24-10-24-24 10-34 24-34z"
        fill="#fff"
      />
      {/* zig-zag crack */}
      <path
        d="M30 52l8-6 6 6 6-7 7 7 6-6 8 5"
        fill="none"
        stroke="#a9761f"
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* spots */}
      <circle cx="42" cy="66" r="3.2" fill="#f0c860" />
      <circle cx="58" cy="68" r="2.4" fill="#f0c860" />
      <circle cx="50" cy="34" r="2.4" fill="#f0c860" />
    </g>
  );
}

function ClawGlyph() {
  return (
    <g fill="#fff">
      {/* three talons */}
      <path d="M32 22c-4 14-5 30-2 46 1 5 8 5 9 0 3-16 2-32-1-46-1-4-5-4-6 0z" />
      <path d="M50 18c-4 16-5 34-2 52 1 5 8 5 9 0 3-18 2-36-1-52-1-4-5-4-6 0z" />
      <path d="M68 22c-4 14-5 30-2 46 1 5 8 5 9 0 3-16 2-32-1-46-1-4-5-4-6 0z" />
    </g>
  );
}

function FootGlyph() {
  return (
    <g fill="#fff">
      {/* heel pad */}
      <ellipse cx="50" cy="64" rx="16" ry="18" />
      {/* three toes */}
      <ellipse cx="35" cy="36" rx="6.5" ry="9" transform="rotate(-18 35 36)" />
      <ellipse cx="50" cy="30" rx="7" ry="10" />
      <ellipse cx="65" cy="36" rx="6.5" ry="9" transform="rotate(18 65 36)" />
    </g>
  );
}

function BoneGlyph() {
  return (
    <g fill="#fff">
      <g transform="rotate(-40 50 50)">
        <rect x="42" y="30" width="16" height="40" rx="8" />
        <circle cx="42" cy="30" r="11" />
        <circle cx="58" cy="30" r="11" />
        <circle cx="42" cy="70" r="11" />
        <circle cx="58" cy="70" r="11" />
      </g>
    </g>
  );
}

export const DINO_KINDS: DinoKind[] = [
  { id: "rex", label: "T-Rex", from: "#4ade80", to: "#16a34a", glow: "#4ade80", Glyph: RexGlyph },
  { id: "bronto", label: "Bronto", from: "#38bdf8", to: "#0284c7", glow: "#38bdf8", Glyph: BrontoGlyph },
  { id: "egg", label: "Egg", from: "#fcd34d", to: "#f59e0b", glow: "#fcd34d", Glyph: EggGlyph },
  { id: "claw", label: "Claw", from: "#fb7185", to: "#e11d48", glow: "#fb7185", Glyph: ClawGlyph },
  { id: "foot", label: "Footprint", from: "#c084fc", to: "#9333ea", glow: "#c084fc", Glyph: FootGlyph },
  { id: "bone", label: "Bone", from: "#f5d0a9", to: "#c2874f", glow: "#f5d0a9", Glyph: BoneGlyph },
];

export const KIND_COUNT = DINO_KINDS.length;

export function DinoTile({ kind }: { kind: number }) {
  const t = DINO_KINDS[kind];
  const gid = `dino-grad-${t.id}`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label={t.label}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.from} />
          <stop offset="1" stopColor={t.to} />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="88" height="88" rx="22" fill={`url(#${gid})`} />
      {/* soft top highlight */}
      <rect x="6" y="6" width="88" height="42" rx="22" fill="#ffffff" opacity="0.12" />
      <g style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.18))" }}>
        <t.Glyph />
      </g>
    </svg>
  );
}
