import type { Metadata, Viewport } from "next";
import MoonRacer from "@/components/game/MoonRacer";

export const metadata: Metadata = {
  title: "Moon Racer — 3D Cyberpunk Lunar Racing",
  description:
    "A 3D animated racing game across the moon: a neon lunar circuit under a starfield sky, with a procedural cyberpunk soundtrack.",
};

// Scoped to /racing only: behave like a native game on iPhone — fill the
// screen edge to edge (incl. the notch/safe area), and disable pinch/
// double-tap zoom so steering by drag never zooms the page.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#05030f",
};

export default function RacingPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-3 md:mb-4">
        <h2 className="text-2xl font-semibold mb-1">
          <span className="gradient-text">Moon Racer</span>
        </h2>
        <p className="text-text-secondary text-sm">
          3D lunar racing · neon track · starfield space · cyberpunk synth
        </p>
      </div>

      {/* On phones fill most of the dynamic viewport (dvh handles Safari's
          collapsing toolbar); on desktop use a fixed comfortable height. */}
      <div className="glass rounded-2xl overflow-hidden h-[calc(100dvh-11rem)] min-h-[380px] md:h-[70vh]">
        <MoonRacer />
      </div>
    </div>
  );
}
