/**
 * CyberpunkAudio — a self-contained procedural music + SFX engine built on the
 * Web Audio API. No external audio files are loaded; every note is synthesized
 * at runtime so the soundtrack works offline and stays tiny.
 *
 * The track is a driving synthwave / cyberpunk loop: a saw bassline, a delayed
 * arpeggio lead, and a four-on-the-floor drum pattern, plus a speed-reactive
 * engine hum and crash/pickup SFX for the game.
 */

type NodeLike = OscillatorNode | AudioBufferSourceNode;

export class CyberpunkAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Sequencer state
  private schedulerId: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private readonly bpm = 128;
  private readonly stepsPerBeat = 4; // 16th notes
  private readonly lookahead = 0.025; // seconds
  private readonly scheduleAhead = 0.12; // seconds

  // Engine hum
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private _playing = false;
  private _muted = false;

  // A minor-key synthwave progression (root note frequencies per bar).
  // i - VI - III - VII  (Am - F - C - G) — classic driving progression.
  private readonly chordRoots = [220.0, 174.61, 261.63, 196.0]; // A3, F3, C4, G3
  // Arpeggio scale offsets (semitone ratios) relative to each chord root.
  private readonly arpPattern = [0, 7, 12, 7, 3, 10, 12, 15];

  get playing() {
    return this._playing;
  }
  get muted() {
    return this._muted;
  }

  /** Lazily create the AudioContext (must be called from a user gesture). */
  private ensureContext() {
    if (this.ctx) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.55;
    this.musicGain.connect(this.master);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    // Pre-render a short white-noise buffer for hats/snares/crashes.
    const len = Math.floor(ctx.sampleRate * 1.0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    // Deterministic PRNG so noise is reproducible without Math.random.
    let seed = 1337;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      data[i] = (seed / 0x3fffffff - 1) * (1 - i / len); // slight decay
    }
    this.noiseBuffer = buf;
  }

  /** Start the soundtrack + engine hum. Safe to call repeatedly. */
  async start() {
    this.ensureContext();
    if (!this.ctx) return;
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    if (this._playing) return;
    this._playing = true;

    this.startEngine();

    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.08;
    this.scheduler();
  }

  /** Stop everything and release the audio graph tail. */
  stop() {
    this._playing = false;
    if (this.schedulerId !== null) {
      clearTimeout(this.schedulerId);
      this.schedulerId = null;
    }
    this.stopEngine();
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(
        this._muted ? 0.0001 : 0.9,
        this.ctx.currentTime,
        0.02
      );
    }
    return this._muted;
  }

  /** Map game speed (0..1) to engine pitch + brightness. */
  setEngineIntensity(t: number) {
    if (!this.engineOsc || !this.engineFilter || !this.ctx) return;
    const clamped = Math.max(0, Math.min(1, t));
    const now = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(55 + clamped * 90, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(
      200 + clamped * 900,
      now,
      0.08
    );
  }

  // ---- Engine hum -------------------------------------------------------

  private startEngine() {
    if (!this.ctx || !this.musicGain) return;
    this.stopEngine();

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 60;

    const sub = this.ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 30;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 300;
    filter.Q.value = 6;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.08;

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start();
    sub.start();

    this.engineOsc = osc;
    this.engineGain = gain;
    this.engineFilter = filter;
    // keep sub referenced via closure through stopEngine
    this._engineSub = sub;
  }
  private _engineSub: OscillatorNode | null = null;

  private stopEngine() {
    const stopNode = (n: NodeLike | null) => {
      if (!n) return;
      try {
        n.stop();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    };
    stopNode(this.engineOsc);
    stopNode(this._engineSub);
    this.engineOsc = null;
    this._engineSub = null;
    if (this.engineGain) {
      this.engineGain.disconnect();
      this.engineGain = null;
    }
    if (this.engineFilter) {
      this.engineFilter.disconnect();
      this.engineFilter = null;
    }
  }

  // ---- Sequencer --------------------------------------------------------

  private scheduler = () => {
    if (!this.ctx || !this._playing) return;
    const secPerStep = 60 / this.bpm / this.stepsPerBeat;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAhead) {
      this.scheduleStep(this.step, this.nextNoteTime);
      this.nextNoteTime += secPerStep;
      this.step = (this.step + 1) % 32; // 2-bar loop
    }
    this.schedulerId = window.setTimeout(this.scheduler, this.lookahead * 1000);
  };

  private scheduleStep(step: number, time: number) {
    const barStep = step % 16;
    const bar = Math.floor(step / 16) % this.chordRoots.length;
    const root = this.chordRoots[bar];

    // --- Drums ---
    // Kick on every beat (steps 0,4,8,12)
    if (barStep % 4 === 0) this.kick(time);
    // Snare/clap on beats 2 and 4 (steps 4,12)
    if (barStep === 4 || barStep === 12) this.snare(time);
    // Hats on offbeat 8ths, with a lighter ghost on 16ths
    if (barStep % 2 === 0) this.hat(time, 0.18);
    else this.hat(time, 0.07);

    // --- Bass --- driving 16th-note root/octave pulse
    const bassSeq = [0, 0, 12, 0, 0, 7, 0, 12, 0, 0, 12, 0, 3, 0, 7, 0];
    const bn = bassSeq[barStep];
    if (barStep % 2 === 0 || bn !== 0) {
      this.bass(time, (root / 2) * this.semi(bn));
    }

    // --- Arp lead --- an 8-step arpeggio spanning the bar
    const arpIdx = Math.floor(barStep / 2) % this.arpPattern.length;
    if (barStep % 2 === 0) {
      this.arp(time, root * this.semi(this.arpPattern[arpIdx]));
    }

    // --- Pad stab on the downbeat of each bar ---
    if (barStep === 0) this.padStab(time, root);
  }

  private semi(n: number) {
    return Math.pow(2, n / 12);
  }

  // ---- Instruments ------------------------------------------------------

  private bass(time: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + 0.18);
    filter.Q.value = 8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.32, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.19);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  private arp(time: number, freq: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.14, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq * 2;
    filter.Q.value = 3;

    // Feedback delay for the classic synthwave shimmer.
    const delay = this.ctx.createDelay();
    delay.delayTime.value = 60 / this.bpm / 2; // dotted-ish echo
    const fb = this.ctx.createGain();
    fb.gain.value = 0.35;
    const wet = this.ctx.createGain();
    wet.gain.value = 0.35;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    gain.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.18);
  }

  private padStab(time: number, root: number) {
    if (!this.ctx || !this.musicGain) return;
    const freqs = [root, root * this.semi(3), root * this.semi(7)]; // minor triad
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    filter.connect(gain);
    gain.connect(this.musicGain);

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = f;
      const detune = this.ctx.createOscillator();
      detune.type = "sawtooth";
      detune.frequency.value = f * 1.005;
      osc.connect(filter);
      detune.connect(filter);
      osc.start(time);
      detune.start(time);
      osc.stop(time + 0.95);
      detune.stop(time + 0.95);
    }
  }

  private kick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.11);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  private snare(time: number) {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1200;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.2);
  }

  private hat(time: number, vol: number) {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(time);
    src.stop(time + 0.06);
  }

  // ---- One-shot SFX -----------------------------------------------------

  /** Bright rising blip for collecting an energy orb. */
  pickup() {
    if (!this.ctx || !this.sfxGain) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(660, time);
    osc.frequency.exponentialRampToValueAtTime(1320, time + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.3, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(time);
    osc.stop(time + 0.24);
  }

  /** Noisy downward crash for a collision. */
  crash() {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const time = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + 0.5);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.6);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.5);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.5, time);
    og.gain.exponentialRampToValueAtTime(0.0001, time + 0.5);
    osc.connect(og);
    og.connect(this.sfxGain);

    src.start(time);
    src.stop(time + 0.62);
    osc.start(time);
    osc.stop(time + 0.52);
  }

  dispose() {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
