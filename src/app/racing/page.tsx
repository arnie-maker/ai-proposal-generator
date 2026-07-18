import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Moon Racer — 3D Cyberpunk Lunar Racing",
  description:
    "A 3D animated racing game wrapping around the moon: a neon lunar circuit under a starfield sky, alien UFOs, a steering wheel, boost, and a procedural cyberpunk soundtrack.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05030f",
};

// The game itself is a single self-contained file (`public/moon-racer.html`,
// Three.js bundled inline) — the exact same build that ships as the standalone
// download and the shared link. Embedding it here keeps all three in lockstep.
export default function RacingPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-3 md:mb-4">
        <h2 className="text-2xl font-semibold mb-1">
          <span className="gradient-text">Moon Racer</span>
        </h2>
        <p className="text-text-secondary text-sm">
          3D lunar racing · neon track · steering wheel + boost · alien UFOs · cyberpunk synth
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden h-[calc(100dvh-11rem)] min-h-[380px] md:h-[70vh]">
        <iframe
          src="/moon-racer.html"
          title="Moon Racer"
          className="w-full h-full block border-0"
          allow="autoplay; fullscreen"
        />
      </div>
    </div>
  );
}
