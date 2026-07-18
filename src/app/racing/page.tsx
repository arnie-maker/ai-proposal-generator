import type { Metadata } from "next";
import MoonRacer from "@/components/game/MoonRacer";

export const metadata: Metadata = {
  title: "Moon Racer — 3D Cyberpunk Lunar Racing",
  description:
    "A 3D animated racing game across the moon: a neon lunar circuit under a starfield sky, with a procedural cyberpunk soundtrack.",
};

export default function RacingPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold mb-1">
          <span className="gradient-text">Moon Racer</span>
        </h2>
        <p className="text-text-secondary text-sm">
          3D lunar racing · neon track · starfield space · cyberpunk synth
        </p>
      </div>

      <div className="glass rounded-2xl overflow-hidden h-[70vh] min-h-[440px]">
        <MoonRacer />
      </div>
    </div>
  );
}
