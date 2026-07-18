"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CyberpunkAudio } from "@/lib/cyberpunkAudio";

type Phase = "ready" | "playing" | "over";

// ---- World constants --------------------------------------------------------
const ROAD_WIDTH = 14; // full width of the drivable road
const ROAD_HALF = ROAD_WIDTH / 2;
const TRACK_LENGTH = 340; // how far ahead the road/scenery extends (−Z)
const CAR_Z = 4; // the player's fixed z position
const SPAWN_Z = -TRACK_LENGTH + 20; // where recycled objects reappear
const RECYCLE_Z = CAR_Z + 12; // once past this z, recycle to the front
const BASE_SPEED = 42;
const MAX_SPEED = 135;
const CAR_HALF_WIDTH = 1.1;

interface Mover {
  mesh: THREE.Object3D;
  kind: "rock" | "barrier" | "orb";
  half: number; // collision half-width
  active: boolean;
}

/** Procedural cratered-regolith texture for the moon surface. */
function makeMoonTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#3a3d47";
  ctx.fillRect(0, 0, size, size);

  // Deterministic PRNG so the texture is stable between renders.
  let seed = 91;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  // Speckle base grain.
  for (let i = 0; i < 6000; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const g = 40 + rnd() * 60;
    ctx.fillStyle = `rgba(${g},${g},${g + 6},0.25)`;
    ctx.fillRect(x, y, 1.4, 1.4);
  }

  // Craters: dark rim-lit circles.
  for (let i = 0; i < 46; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 8 + rnd() * 34;
    const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    grad.addColorStop(0, "rgba(20,20,26,0.85)");
    grad.addColorStop(0.7, "rgba(46,48,58,0.5)");
    grad.addColorStop(1, "rgba(120,124,140,0.15)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // bright highlight rim
    ctx.strokeStyle = "rgba(150,155,170,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, -0.4, 1.2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 16);
  return tex;
}

/** A low-poly neon hover-racer. */
function makeCar(): THREE.Group {
  const car = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x151a2e,
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0x0a1030,
    emissiveIntensity: 0.4,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 2.2,
    metalness: 0.2,
    roughness: 0.4,
  });
  const glowMagenta = new THREE.MeshStandardMaterial({
    color: 0xff2bd6,
    emissive: 0xff2bd6,
    emissiveIntensity: 2.2,
  });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 3.4), bodyMat);
  hull.position.y = 0.55;
  car.add(hull);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.5, 1.6),
    new THREE.MeshStandardMaterial({
      color: 0x0a0f24,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x101a3a,
      emissiveIntensity: 0.5,
    })
  );
  cabin.position.set(0, 0.95, -0.1);
  car.add(cabin);

  // Nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.2, 4), bodyMat);
  nose.rotation.x = -Math.PI / 2;
  nose.rotation.z = Math.PI / 4;
  nose.position.set(0, 0.55, -2.0);
  car.add(nose);

  // Underglow strips
  const strip = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 3.2), glowMat);
  strip.position.y = 0.32;
  car.add(strip);

  // Rear light bar
  const rear = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.12), glowMagenta);
  rear.position.set(0, 0.6, 1.75);
  car.add(rear);

  // Fins
  for (const sx of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.0), glowMat);
    fin.position.set(sx * 1.05, 0.75, 1.3);
    car.add(fin);
  }

  // Engine glow point light travels with the car.
  const light = new THREE.PointLight(0x00e5ff, 6, 14, 2);
  light.position.set(0, 1.2, 1.6);
  car.add(light);

  return car;
}

export default function MoonRacer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<CyberpunkAudio | null>(null);

  const [phase, setPhase] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [speedPct, setSpeedPct] = useState(0);
  const [muted, setMuted] = useState(false);

  // Mutable game state shared with the animation loop (avoids re-renders).
  const gs = useRef({
    phase: "ready" as Phase,
    speed: BASE_SPEED,
    distance: 0,
    scoreVal: 0,
    carX: 0,
    targetX: 0,
    steer: 0, // -1 left, +1 right
    boost: 0, // -1 brake, +1 accelerate
    movers: [] as Mover[],
  });

  // Bridge for the loop to push HUD updates back into React sparingly.
  const startGameRef = useRef<() => void>(() => {});

  const toggleMute = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setMuted(a.toggleMute());
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Load best score from previous sessions. Deferred out of the effect body
    // (via rAF) so React starts from the SSR value and updates after mount,
    // avoiding both a hydration mismatch and a synchronous-setState warning.
    const loadBest = requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem("moonracer.best");
        if (stored) setBest(parseInt(stored, 10) || 0);
      } catch {
        /* storage unavailable */
      }
    });

    const audio = new CyberpunkAudio();
    audioRef.current = audio;

    // ---- Renderer / scene / camera ----
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05030f);
    scene.fog = new THREE.Fog(0x0a0620, 60, TRACK_LENGTH - 40);

    const camera = new THREE.PerspectiveCamera(
      68,
      mount.clientWidth / mount.clientHeight,
      0.1,
      2000
    );
    camera.position.set(0, 5.2, CAR_Z + 9);
    camera.lookAt(0, 1.2, CAR_Z - 20);

    // ---- Lights ----
    scene.add(new THREE.AmbientLight(0x4455aa, 0.6));
    const key = new THREE.DirectionalLight(0xbfd0ff, 1.1);
    key.position.set(-30, 40, -10);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff3bd0, 0.5);
    rim.position.set(20, 10, 30);
    scene.add(rim);

    // ---- Starfield ----
    const starGeo = new THREE.BufferGeometry();
    const STAR_COUNT = 1800;
    const starPos = new Float32Array(STAR_COUNT * 3);
    const starCol = new Float32Array(STAR_COUNT * 3);
    let sseed = 7;
    const srnd = () => {
      sseed = (sseed * 1103515245 + 12345) & 0x7fffffff;
      return sseed / 0x7fffffff;
    };
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 400 + srnd() * 700;
      const theta = srnd() * Math.PI * 2;
      const phi = Math.acos(srnd() * 2 - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.6 + 20;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const tint = srnd();
      // cyan / magenta / white star tints for the cyberpunk sky
      if (tint < 0.33) {
        starCol[i * 3] = 0.6; starCol[i * 3 + 1] = 0.9; starCol[i * 3 + 2] = 1.0;
      } else if (tint < 0.55) {
        starCol[i * 3] = 1.0; starCol[i * 3 + 1] = 0.5; starCol[i * 3 + 2] = 0.9;
      } else {
        starCol[i * 3] = 1.0; starCol[i * 3 + 1] = 1.0; starCol[i * 3 + 2] = 1.0;
      }
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        size: 2.4,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
      })
    );
    scene.add(stars);

    // ---- The giant moon in the sky (background asset) ----
    const moonTex = makeMoonTexture();
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(70, 48, 48),
      new THREE.MeshStandardMaterial({
        map: moonTex,
        color: 0xcfd3e0,
        roughness: 1,
        metalness: 0,
        emissive: 0x223055,
        emissiveIntensity: 0.25,
      })
    );
    moon.position.set(-140, 120, -520);
    scene.add(moon);

    // A hazy halo behind the moon.
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(96, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x3355aa,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      })
    );
    halo.position.copy(moon.position);
    scene.add(halo);

    // A second, smaller ringed planet for depth.
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(26, 32, 32),
      new THREE.MeshStandardMaterial({
        color: 0xff5ea8,
        emissive: 0x551133,
        emissiveIntensity: 0.5,
        roughness: 0.8,
      })
    );
    planet.position.set(180, 90, -560);
    scene.add(planet);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(34, 52, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffa6d5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      })
    );
    ring.rotation.x = Math.PI / 2.4;
    ring.rotation.y = 0.3;
    ring.position.copy(planet.position);
    scene.add(ring);

    // ---- Moon ground (the track surface) ----
    const groundMat = new THREE.MeshStandardMaterial({
      map: moonTex.clone(),
      color: 0x6a6e7e,
      roughness: 1,
      metalness: 0,
    });
    (groundMat.map as THREE.Texture).needsUpdate = true;
    (groundMat.map as THREE.Texture).repeat.set(10, 40);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(600, TRACK_LENGTH + 120, 1, 1),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, CAR_Z - TRACK_LENGTH / 2 + 40);
    scene.add(ground);

    // ---- The road ----
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, TRACK_LENGTH + 120),
      new THREE.MeshStandardMaterial({
        color: 0x0c0c1a,
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x05050f,
        emissiveIntensity: 0.5,
      })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, CAR_Z - TRACK_LENGTH / 2 + 40);
    scene.add(road);

    // Neon edge rails (glowing tubes down both sides).
    const railGeo = new THREE.BoxGeometry(0.3, 0.3, TRACK_LENGTH + 120);
    const railMatL = new THREE.MeshStandardMaterial({
      color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 2.6,
    });
    const railMatR = new THREE.MeshStandardMaterial({
      color: 0xff2bd6, emissive: 0xff2bd6, emissiveIntensity: 2.6,
    });
    const railL = new THREE.Mesh(railGeo, railMatL);
    railL.position.set(-ROAD_HALF, 0.25, road.position.z);
    scene.add(railL);
    const railR = new THREE.Mesh(railGeo, railMatR);
    railR.position.set(ROAD_HALF, 0.25, road.position.z);
    scene.add(railR);

    // Scrolling center lane dashes (an instanced set recycled toward camera).
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0x9fb4ff, emissive: 0x6f8bff, emissiveIntensity: 1.4,
    });
    const dashGeo = new THREE.BoxGeometry(0.28, 0.05, 3.2);
    const DASH_COUNT = 34;
    const DASH_GAP = (TRACK_LENGTH + 40) / DASH_COUNT;
    const dashes: THREE.Mesh[] = [];
    for (let i = 0; i < DASH_COUNT; i++) {
      const d = new THREE.Mesh(dashGeo, dashMat);
      d.position.set(0, 0.06, CAR_Z - i * DASH_GAP);
      scene.add(d);
      dashes.push(d);
    }
    // Side glow posts along the rails.
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xffe08a, emissive: 0xffc14d, emissiveIntensity: 2.0,
    });
    const postGeo = new THREE.BoxGeometry(0.25, 1.6, 0.25);
    const posts: THREE.Mesh[] = [];
    const POST_COUNT = 24;
    const POST_GAP = (TRACK_LENGTH + 40) / POST_COUNT;
    for (let i = 0; i < POST_COUNT; i++) {
      for (const sx of [-1, 1]) {
        const p = new THREE.Mesh(postGeo, postMat);
        p.position.set(sx * (ROAD_HALF + 1.4), 0.8, CAR_Z - i * POST_GAP);
        scene.add(p);
        posts.push(p);
      }
    }

    // ---- The player's car ----
    const car = makeCar();
    car.position.set(0, 0, CAR_Z);
    scene.add(car);

    // ---- Movers (obstacles + collectibles) ----
    const movers: Mover[] = [];
    const rockGeo = new THREE.DodecahedronGeometry(1.2, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x8a8d9a, roughness: 1, metalness: 0, flatShading: true,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xff3355, emissive: 0xff2233, emissiveIntensity: 1.8, metalness: 0.4,
    });
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x66ffcc, emissive: 0x33ffbb, emissiveIntensity: 2.4,
    });

    let mseed = 23;
    const mrnd = () => {
      mseed = (mseed * 1103515245 + 12345) & 0x7fffffff;
      return mseed / 0x7fffffff;
    };
    const laneX = () => (mrnd() * 2 - 1) * (ROAD_HALF - 1.4);

    const resetMover = (m: Mover, z: number) => {
      m.mesh.position.z = z;
      m.mesh.position.x = laneX();
      m.active = true;
      m.mesh.visible = true;
    };

    const MOVER_COUNT = 22;
    for (let i = 0; i < MOVER_COUNT; i++) {
      const roll = mrnd();
      let mesh: THREE.Object3D;
      let kind: Mover["kind"];
      let half: number;
      if (roll < 0.55) {
        mesh = new THREE.Mesh(rockGeo, rockMat);
        const s = 0.7 + mrnd() * 1.1;
        mesh.scale.setScalar(s);
        mesh.position.y = 0.9 * s;
        mesh.rotation.set(mrnd() * 3, mrnd() * 3, mrnd() * 3);
        kind = "rock";
        half = 1.0 * s;
      } else if (roll < 0.78) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.5), barrierMat);
        mesh.position.y = 0.7;
        kind = "barrier";
        half = 1.1;
      } else {
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), orbMat);
        mesh.position.y = 1.1;
        kind = "orb";
        half = 0.9;
      }
      mesh.position.x = laneX();
      // Stagger initial z evenly across the track.
      mesh.position.z = SPAWN_Z + i * ((TRACK_LENGTH - 20) / MOVER_COUNT);
      scene.add(mesh);
      movers.push({ mesh, kind, half, active: true });
    }
    gs.current.movers = movers;

    // ---- Input handling ----
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(k)) {
        e.preventDefault();
      }
      keys.add(k);
      if (k === " " && gs.current.phase !== "playing") startGameRef.current();
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Pointer / touch steering: drag horizontally to aim the car.
    // touch-action:none stops iOS Safari from scrolling / pull-to-refreshing
    // and from firing double-tap zoom while the player drags to steer.
    const el = renderer.domElement;
    el.style.touchAction = "none";
    el.style.cursor = "grab";
    let pointerActive = false;
    const onPointerMove = (clientX: number) => {
      if (!pointerActive) return;
      const rect = el.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      gs.current.targetX = nx * (ROAD_HALF - CAR_HALF_WIDTH);
    };
    const pd = (e: PointerEvent) => {
      e.preventDefault();
      pointerActive = true;
      // A tap on the canvas also starts/restarts the race (unlocks iOS audio
      // inside the gesture).
      if (gs.current.phase !== "playing") startGameRef.current();
      onPointerMove(e.clientX);
    };
    const pm = (e: PointerEvent) => {
      if (pointerActive) e.preventDefault();
      onPointerMove(e.clientX);
    };
    const pu = () => {
      pointerActive = false;
    };
    el.addEventListener("pointerdown", pd);
    el.addEventListener("pointermove", pm);
    window.addEventListener("pointerup", pu);
    window.addEventListener("pointercancel", pu);

    // Expose steer/boost setters for on-screen buttons via custom events.
    const onControl = (e: Event) => {
      const d = (e as CustomEvent).detail as { steer?: number; boost?: number };
      if (d.steer !== undefined) gs.current.steer = d.steer;
      if (d.boost !== undefined) gs.current.boost = d.boost;
    };
    window.addEventListener("moonracer-control", onControl);

    // ---- Game control functions ----
    const spawnFront = (m: Mover) => {
      // Reappear at the far end with a fresh lane + freshly-randomised type feel.
      resetMover(m, SPAWN_Z - mrnd() * 30);
    };

    let hudAccumulator = 0;

    const startGame = () => {
      const s = gs.current;
      s.phase = "playing";
      s.speed = BASE_SPEED;
      s.distance = 0;
      s.scoreVal = 0;
      s.carX = 0;
      s.targetX = 0;
      // Re-spread movers along the track.
      movers.forEach((m, i) => {
        m.active = true;
        m.mesh.visible = true;
        m.mesh.position.z = SPAWN_Z + i * ((TRACK_LENGTH - 20) / movers.length);
        m.mesh.position.x = laneX();
      });
      setPhase("playing");
      setScore(0);
      audio.start().then(() => setMuted(audio.muted));
    };
    startGameRef.current = startGame;

    const endGame = () => {
      const s = gs.current;
      s.phase = "over";
      setPhase("over");
      audio.crash();
      const finalScore = Math.floor(s.scoreVal);
      setScore(finalScore);
      setBest((prev) => {
        const nb = Math.max(prev, finalScore);
        try {
          window.localStorage.setItem("moonracer.best", String(nb));
        } catch {
          /* ignore */
        }
        return nb;
      });
    };

    // ---- Resize ----
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ---- Main loop ----
    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const s = gs.current;

      // Ambient motion that runs in every phase.
      stars.rotation.y += dt * 0.006;
      moon.rotation.y += dt * 0.01;
      planet.rotation.y += dt * 0.02;

      // Idle bob for the car while waiting.
      const time = clock.elapsedTime;
      car.position.y = Math.sin(time * 2) * 0.06;

      if (s.phase === "playing") {
        // Accelerate over distance; boost/brake nudges it.
        const targetSpeed = Math.min(
          MAX_SPEED,
          BASE_SPEED + s.distance * 0.02 + s.boost * 18
        );
        s.speed += (targetSpeed - s.speed) * Math.min(1, dt * 1.5);
        s.speed = Math.max(20, s.speed);

        const move = s.speed * dt;
        s.distance += move;
        s.scoreVal += move * 0.6;

        // Keyboard steering.
        let steer = s.steer;
        if (keys.has("arrowleft") || keys.has("a")) steer -= 1;
        if (keys.has("arrowright") || keys.has("d")) steer += 1;
        let boost = s.boost;
        if (keys.has("arrowup") || keys.has("w")) boost += 1;
        if (keys.has("arrowdown") || keys.has("s")) boost -= 1;
        s.boost = Math.max(-1, Math.min(1, boost));

        // Apply steering to carX (pointer target takes over when dragging).
        if (steer !== 0) {
          s.carX += steer * dt * 18;
          s.targetX = s.carX;
        } else {
          s.carX += (s.targetX - s.carX) * Math.min(1, dt * 8);
        }
        const limit = ROAD_HALF - CAR_HALF_WIDTH;
        s.carX = Math.max(-limit, Math.min(limit, s.carX));
        car.position.x = s.carX;

        // Bank the car into the turn.
        const bankTarget = -(s.targetX - car.position.x) * 0.35 - steer * 0.18;
        car.rotation.z += (bankTarget - car.rotation.z) * Math.min(1, dt * 8);
        car.rotation.y = car.rotation.z * 0.4;

        // Scroll ground + rails illusion via texture offset.
        const gmap = groundMat.map as THREE.Texture;
        gmap.offset.y -= move * 0.0025;

        // Move dashes toward the camera; recycle past the player.
        for (const d of dashes) {
          d.position.z += move;
          if (d.position.z > RECYCLE_Z) d.position.z -= DASH_COUNT * DASH_GAP;
        }
        for (const p of posts) {
          p.position.z += move;
          if (p.position.z > RECYCLE_Z) p.position.z -= POST_COUNT * POST_GAP;
        }

        // Move obstacles/collectibles + collide.
        for (const m of movers) {
          m.mesh.position.z += move;
          if (m.kind === "rock") m.mesh.rotation.x += dt * 1.2;
          if (m.kind === "orb") m.mesh.rotation.y += dt * 3;

          if (m.mesh.position.z > RECYCLE_Z) {
            spawnFront(m);
            continue;
          }

          // Collision test near the car's z-band.
          if (
            m.active &&
            Math.abs(m.mesh.position.z - CAR_Z) < 1.8 &&
            Math.abs(m.mesh.position.x - s.carX) < m.half + CAR_HALF_WIDTH
          ) {
            if (m.kind === "orb") {
              m.active = false;
              m.mesh.visible = false;
              s.scoreVal += 150;
              audio.pickup();
            } else {
              endGame();
            }
          }
        }

        // Camera gently follows the car for a chase-cam feel.
        camera.position.x += (s.carX * 0.4 - camera.position.x) * Math.min(1, dt * 4);
        camera.lookAt(s.carX * 0.3, 1.2, CAR_Z - 22);

        // Engine intensity from normalized speed.
        audio.setEngineIntensity((s.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED));

        // Throttle HUD updates to ~10/sec.
        hudAccumulator += dt;
        if (hudAccumulator > 0.1) {
          hudAccumulator = 0;
          setScore(Math.floor(s.scoreVal));
          setSpeedPct(
            Math.round(((s.speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 100)
          );
        }
      } else {
        // Ready / over: slowly drift the car + camera back to a level center.
        car.position.x += (0 - car.position.x) * Math.min(1, dt * 3);
        car.rotation.z += (0 - car.rotation.z) * Math.min(1, dt * 3);
        car.rotation.y += (0 - car.rotation.y) * Math.min(1, dt * 3);
        camera.position.x += (0 - camera.position.x) * Math.min(1, dt * 3);
        camera.lookAt(0, 1.2, CAR_Z - 22);
      }

      renderer.render(scene, camera);
    };
    animate();

    // ---- Cleanup ----
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(loadBest);
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerup", pu);
      window.removeEventListener("pointercancel", pu);
      window.removeEventListener("moonracer-control", onControl);
      el.removeEventListener("pointerdown", pd);
      el.removeEventListener("pointermove", pm);
      audio.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const anyObj = obj as THREE.Mesh;
        if (anyObj.geometry) anyObj.geometry.dispose();
        const mat = anyObj.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      moonTex.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
    };
  }, []);

  // Keep the ref phase in sync so the loop reads the latest.
  useEffect(() => {
    gs.current.phase = phase;
  }, [phase]);

  // On-screen control button helpers (mobile).
  const sendControl = (detail: { steer?: number; boost?: number }) =>
    window.dispatchEvent(new CustomEvent("moonracer-control", { detail }));

  const start = () => startGameRef.current();

  return (
    <div
      className="relative w-full h-full select-none touch-none"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div ref={mountRef} className="absolute inset-0 touch-none" />

      {/* Scanline / vignette overlay for the cyberpunk feel */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(5,3,15,0.55) 100%)",
        }}
      />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 p-4 md:p-6 flex flex-col">
        <div className="flex items-start justify-between">
          <div className="glass rounded-xl px-4 py-2">
            <div className="text-[10px] uppercase tracking-widest text-text-secondary">
              Score
            </div>
            <div className="text-2xl font-bold tabular-nums gradient-text">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="glass rounded-xl px-4 py-2 text-right">
              <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                Best
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {best.toLocaleString()}
              </div>
            </div>
            <button
              onClick={toggleMute}
              className="pointer-events-auto glass rounded-xl px-3 py-2 text-xs font-medium hover:border-accent-blue/40 transition"
            >
              {muted ? "🔇 Muted" : "🔊 Sound"}
            </button>
          </div>
        </div>

        {/* Speed bar */}
        <div className="mt-3 w-40 md:w-56">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">
            Velocity · {speedPct}%
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-150"
              style={{
                width: `${Math.max(4, speedPct)}%`,
                background: "linear-gradient(90deg,#00e5ff,#8b5cf6,#ff2bd6)",
              }}
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Mobile touch controls (also padded clear of the iPhone home bar) */}
        <div
          className="md:hidden flex items-center justify-between gap-3"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex gap-4">
            <button
              aria-label="Steer left"
              className="pointer-events-auto touch-none glass rounded-2xl w-[4.5rem] h-[4.5rem] text-2xl active:bg-white/10"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => { e.preventDefault(); sendControl({ steer: -1 }); }}
              onPointerUp={() => sendControl({ steer: 0 })}
              onPointerLeave={() => sendControl({ steer: 0 })}
              onPointerCancel={() => sendControl({ steer: 0 })}
            >
              ◀
            </button>
            <button
              aria-label="Steer right"
              className="pointer-events-auto touch-none glass rounded-2xl w-[4.5rem] h-[4.5rem] text-2xl active:bg-white/10"
              onContextMenu={(e) => e.preventDefault()}
              onPointerDown={(e) => { e.preventDefault(); sendControl({ steer: 1 }); }}
              onPointerUp={() => sendControl({ steer: 0 })}
              onPointerLeave={() => sendControl({ steer: 0 })}
              onPointerCancel={() => sendControl({ steer: 0 })}
            >
              ▶
            </button>
          </div>
          <button
            aria-label="Boost"
            className="pointer-events-auto touch-none glass rounded-2xl w-[4.5rem] h-[4.5rem] text-2xl active:bg-white/10"
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => { e.preventDefault(); sendControl({ boost: 1 }); }}
            onPointerUp={() => sendControl({ boost: 0 })}
            onPointerLeave={() => sendControl({ boost: 0 })}
            onPointerCancel={() => sendControl({ boost: 0 })}
          >
            🚀
          </button>
        </div>
      </div>

      {/* Overlays */}
      {phase !== "playing" && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="glass rounded-2xl px-8 py-8 max-w-md text-center">
            {phase === "ready" ? (
              <>
                <h2 className="text-3xl font-bold mb-2 gradient-text">
                  MOON RACER
                </h2>
                <p className="text-text-secondary text-sm mb-5">
                  Blast across the lunar circuit. Dodge the rocks and barriers,
                  grab energy orbs, and don&apos;t crash. Synthwave engaged.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold mb-1 text-white">WRECKED</h2>
                <p className="text-text-secondary text-sm mb-1">Final score</p>
                <p className="text-4xl font-bold gradient-text mb-4 tabular-nums">
                  {score.toLocaleString()}
                </p>
              </>
            )}

            <button onClick={start} className="btn-gradient text-base pointer-events-auto">
              {phase === "ready" ? "▶ Start Race" : "↻ Race Again"}
            </button>

            <div className="mt-5 text-xs text-text-secondary leading-relaxed">
              <span className="text-text-primary font-medium">Controls</span>
              <br />
              {/* Touch-first hint on phones, keyboard hint on desktop. */}
              <span className="md:hidden">
                Drag to steer, or use the ◀ ▶ buttons · hold 🚀 to boost
              </span>
              <span className="hidden md:inline">
                ← → or A / D to steer · ↑ ↓ to boost / brake · Space to start
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
