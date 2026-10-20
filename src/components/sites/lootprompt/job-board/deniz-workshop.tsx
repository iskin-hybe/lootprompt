"use client";

import { useEffect, useRef, useState } from "react";

/** A job as the workshop's cork board shows it. */
export interface WorkshopJob {
  title: string;
  votes: number;
  status: "open" | "greenlit";
  author: string | null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const progress = (v: number, from: number, to: number) => clamp((v - from) / (to - from));
/** Deterministic hand-drawn wobble, stepped at 12 fps. */
const wobble = (time: number, seed: number, amount = 0.7) =>
  Math.sin(Math.floor(time * 12) * 12.9898 + seed * 78.233) * amount;

function inkStroke(x1: number, y1: number, x2: number, y2: number, time: number, seed: number) {
  const cx = (x1 + x2) / 2 + wobble(time, seed, 4);
  const cy = (y1 + y2) / 2 + wobble(time, seed + 1, 3);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** Splits a job title into two short cork-card lines. */
function cardLines(title: string): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const first: string[] = [];
  const rest: string[] = [];
  for (const word of words) (first.join(" ").length < 18 ? first : rest).push(word);
  return [first.join(" ").slice(0, 28), rest.join(" ").slice(0, 28)].filter(Boolean);
}

/**
 * Deniz at his desk: an 8-second loop (typing, thinking, light-bulb moment)
 * drawn at ~12 fps while on screen.
 */
export function DenizWorkshop({
  job,
  goal,
  mini = false,
  viewBox = "0 0 640 340",
}: {
  job: WorkshopJob | null;
  goal: number;
  mini?: boolean;
  viewBox?: string;
}) {
  const [clock, setClock] = useState(0);
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let visible = true;
    let frame = 0;
    let last = 0;
    const el = ref.current;
    const observer = el
      ? new IntersectionObserver(
          ([entry]) => {
            visible = !!entry?.isIntersecting;
          },
          { threshold: 0.05 },
        )
      : null;
    if (el && observer) observer.observe(el);
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibility);
    const tick = (now: number) => {
      if (visible && document.visibilityState !== "hidden" && now - last > 83) {
        last = now;
        setClock(now / 1000);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const t = clock;
  const phase = t % 8;
  const typing = phase < 1.8 || (phase > 5.6 && phase < 7.4);
  const reach = progress(phase, 1.8, 2.6);
  const think = progress(phase, 2.7, 4);
  const idea = progress(phase, 4, 5);
  const tap = progress(phase, 5.1, 7.2);
  const barPct = 18 + ((t * 9) % 53);
  const beat = Math.floor(t * 12) % 2;

  const [rightX, rightY] = typing
    ? [260 + beat * 8 + tap * 10, 229 + beat * 4]
    : reach > 0 && reach < 1
      ? [276, lerp(248, 210, smooth(reach))]
      : [257, 235];
  const [leftX, leftY] = typing
    ? [181 - beat * 7 - tap * 7, 231 + (1 - beat) * 4]
    : think > 0 && think < 1
      ? [188, 151]
      : [193, 236];
  const headY = 142 + wobble(t, 3, 1.1) - idea * 2;

  const lines = cardLines(job?.title ?? "Choose the next heist");
  const status = job
    ? `${job.votes}/${goal} · ${job.status === "greenlit" ? "GREENLIT" : "waiting for the crew"}`
    : "waiting for the crew";
  const requestedBy = job?.author ? `requested by @${job.author}` : "requested by the crew";
  const screen = ["prompt: cinematic", "light leaks, gloves", "camera drift --slow"].slice(
    0,
    phase < 1 ? 1 : phase < 5.6 ? 2 : 3,
  );

  return (
    <svg
      ref={ref}
      className={`deniz-workshop${mini ? " is-mini" : ""}`}
      viewBox={viewBox}
      role="img"
      aria-label="Deniz at work"
    >
      <rect className="dw-wall" x="0" y="0" width="640" height="340" />
      <g className="dw-cork" transform="translate(38 36)">
        <rect width="162" height="110" rx="4" />
        <text x="12" y="22">
          CURRENT JOB
        </text>
        {lines.map((line, i) => (
          <text key={line} x="14" y={48 + i * 18} className="dw-card-title">
            {line}
          </text>
        ))}
        <text x="14" y="90" className="dw-red">
          {status}
        </text>
        <text x="14" y="106" className="dw-tiny">
          {requestedBy}
        </text>
      </g>
      <g className="dw-clock" transform="translate(300 42)">
        <circle r="24" />
        <path d="M0 -16V0L12 7" transform={`rotate(${tap * 900 + wobble(t, 2, 2)})`} />
      </g>
      <g className="dw-vault" transform="translate(500 52)">
        <path d="M44 5v116c0 18-12 29-30 29h-18" />
        <rect x="-28" y="128" width="104" height="54" rx="5" />
        <text x="24" y="158">
          THE VAULT
        </text>
      </g>
      <ellipse className="dw-shadow" cx="230" cy="300" rx="96" ry="15" />
      <path className="dw-chair" d="M207 227h68l12 68M227 228l-22 67" />
      <g className="dw-body">
        <path d="M185 201c12-30 70-31 85 0l-6 58h-72z" />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${196 + i * 12} 198l-3 58`} />
        ))}
        <path d={inkStroke(202, 207, leftX, leftY, t, 11)} />
        <path d={inkStroke(254, 206, rightX, rightY, t, 17)} />
        <circle cx={leftX} cy={leftY} r="8" />
        <circle cx={rightX} cy={rightY} r="8" />
      </g>
      <g className="dw-head" transform={`translate(226 ${headY})`}>
        <circle cx="0" cy="0" r="39" />
        {Array.from({ length: 8 }, (_, i) => (
          <circle
            key={i}
            cx={-31 + i * 9 + wobble(t, i, think ? 2.6 : 0.8)}
            cy={-34 + wobble(t, i + 9, think ? 2.4 : 0.7)}
            r={10 - (i % 3)}
          />
        ))}
        <path className="dw-beard" d="M-25 17c14 24 42 24 52 0c-5 38-47 38-52 0z" />
        <path className="dw-glasses" d="M-31-7h23v15h-23zM8-7h23v15h-23zM-8 0H8" />
        <path d="M0 0l-4 15h9" />
        <path d={idea > 0.6 ? "M-9 22q10 10 21 0" : "M-8 24q9 4 18 0"} />
        {idea > 0.4 ? <path className="dw-glint" d="M-28 -13l10 8M11 -13l11 8" /> : null}
      </g>
      <rect className="dw-desk" x="115" y="260" width="290" height="18" rx="4" />
      <g className="dw-laptop" transform="translate(200 203)">
        <rect x="0" y="0" width="108" height="67" rx="4" />
        {screen.map((line, i) => (
          <text key={`${line}-${i}`} x="12" y={19 + i * 14}>
            {line}
          </text>
        ))}
        <rect x="12" y="55" width="82" height="5" rx="3" />
        <rect
          className="dw-progress"
          x="12"
          y="55"
          width={Math.max(4, Math.min(82, barPct * 0.82))}
          height="5"
          rx="3"
        />
      </g>
      <g className="dw-mug" transform="translate(324 233)">
        <path d="M0 0h27l-4 28H4z" />
        <path d="M26 8c17 0 16 14 0 14" />
        <path className="dw-steam" d="M8 -7c-6-11 9-11 3-22M18 -6c-5-9 8-10 4-18" />
      </g>
      <g className="dw-lamp" transform="translate(382 151)">
        <path d="M18 105V35M18 35l42-18M51 6l38 20l-56 18z" />
        <path className="dw-lamp-ray" d="M62 43l-48 112h138z" />
      </g>
      {think > 0.2 && think < 0.9 ? (
        <text x="282" y="112" className="dw-bubble">
          ?
        </text>
      ) : null}
      {idea > 0.35 ? (
        <g className="dw-bulb" transform="translate(287 88)">
          <circle r="14" />
          <path d="M-7 20h14M-18-18l-10-10M18-18l10-10M0-22v-14" />
        </g>
      ) : null}
      {tap > 0.2 ? (
        <text x="314" y="181" className="dw-tak">
          tak tak
        </text>
      ) : null}
    </svg>
  );
}
