import { useMemo } from "react";

// Procedural fingerprint drawn from a short seed string (port of the source's
// guestbook print renderer). Same seed, same whorl.

const CENTER_X = 50;
const CENTER_Y = 62;
const VIEW_HEIGHT = 130;

/** FNV-1a 32-bit hash. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32 variant) seeded from the hash. */
function seededRandom(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 1831565813;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Harmonic {
  amp: number;
  freq: number;
  phase: number;
}

interface RidgeShape {
  harmonics: Harmonic[];
  squash: number;
  tilt: number;
}

interface Gap {
  start: number;
  end: number;
}

interface Ridge {
  d: string;
  width: number;
}

function wobble(shape: RidgeShape, angle: number): number {
  let r = 1;
  for (const h of shape.harmonics) r += h.amp * Math.sin(angle * h.freq + h.phase);
  return r;
}

/** One closed ridge loop (or an open arc when it has a gap). */
function ridgePath(radius: number, shape: RidgeShape, jitter: number, gap: Gap | null): string {
  const parts: string[] = [];
  let drawing = false;
  for (let i = 0; i <= 120; i += 1) {
    const t = i / 120;
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const deg = t * 360;
    if (gap && deg > gap.start && deg < gap.end) {
      drawing = false;
      continue;
    }
    const r = radius * (wobble(shape, angle) + jitter * Math.sin(angle * 7 + radius));
    const x = CENTER_X + Math.cos(angle + shape.tilt) * r * 0.78;
    const y = CENTER_Y + Math.sin(angle + shape.tilt) * r * (1 + shape.squash);
    parts.push(`${drawing ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`);
    drawing = true;
  }
  const d = parts.join(" ");
  return gap ? d : `${d} Z`;
}

function buildRidges(seed: string): Ridge[] {
  const rand = seededRandom(seed);
  const shape: RidgeShape = {
    harmonics: [
      { amp: 0.05 + rand() * 0.06, freq: 2, phase: rand() * Math.PI * 2 },
      { amp: 0.02 + rand() * 0.04, freq: 3, phase: rand() * Math.PI * 2 },
      { amp: 0.01 + rand() * 0.025, freq: 5, phase: rand() * Math.PI * 2 },
    ],
    squash: 0.12 + rand() * 0.16,
    tilt: (rand() - 0.5) * 0.3,
  };
  const count = 8 + Math.floor(rand() * 4);
  const spacing = 3.6 + rand() * 0.9;
  const ridges: Ridge[] = [];
  for (let i = 0; i < count; i += 1) {
    const radius = 6 + i * spacing;
    const broken = i > 1 && rand() > 0.55;
    const start = rand() * 300;
    const gap = broken ? { start, end: start + 14 + rand() * 26 } : null;
    ridges.push({ d: ridgePath(radius, shape, (rand() - 0.5) * 0.02, gap), width: 1 + rand() * 0.4 });
  }

  // Central swirl.
  const turns = 1.2 + rand() * 0.9;
  const direction = rand() > 0.5 ? 1 : -1;
  const swirl: string[] = [];
  for (let i = 0; i <= 60; i += 1) {
    const t = i / 60;
    const angle = direction * t * Math.PI * 2 * turns;
    const r = 0.6 + t * 4;
    swirl.push(
      `${i === 0 ? "M" : "L"}${(CENTER_X + Math.cos(angle) * r * 0.8).toFixed(2)} ${(CENTER_Y + Math.sin(angle) * r * 1.15).toFixed(2)}`,
    );
  }
  ridges.push({ d: swirl.join(" "), width: 1.2 });
  return ridges;
}

/** Faint full print with an inked copy revealed bottom-up by `progress` (0–1). */
export function Fingerprint({
  seed,
  progress = 1,
  className,
  title,
}: {
  seed: string;
  progress?: number;
  className?: string;
  title?: string;
}) {
  const ridges = useMemo(() => buildRidges(seed), [seed]);
  const clipId = `print-fill-${hashSeed(seed).toString(36)}`;
  const inked = VIEW_HEIGHT * Math.min(1, Math.max(0, progress));

  return (
    <svg
      viewBox="0 0 100 130"
      fill="none"
      className={className}
      {...(title ? { role: "img", "aria-label": title } : { role: "presentation", "aria-hidden": true })}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y={VIEW_HEIGHT - inked} width="100" height={inked} />
        </clipPath>
      </defs>
      <g stroke="currentColor" strokeLinecap="round" opacity="0.16">
        {ridges.map((ridge, i) => (
          <path key={i} d={ridge.d} strokeWidth={ridge.width} />
        ))}
      </g>
      <g stroke="currentColor" strokeLinecap="round" clipPath={`url(#${clipId})`}>
        {ridges.map((ridge, i) => (
          <path key={i} d={ridge.d} strokeWidth={ridge.width} />
        ))}
      </g>
    </svg>
  );
}
