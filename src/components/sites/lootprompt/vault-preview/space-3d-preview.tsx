"use client";

import { ArrowUpRight, MousePointerClick, Move3d, Orbit } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createTiltSpring, tiltTransform } from "./tilt-spring";
import "./vault-preview.css";

/** Three film rows, each offset by 1.1 × 108px from the centre row. */
const ROWS = [-1.1, 0, 1.1];

/** 50 fixed "stars" behind the reel, laid out like the source's modulo pattern. */
const STARS = Array.from({ length: 50 }, (_, i) => {
  const n = (i * 73) % 100;
  return {
    left: `${(n * 37) % 100}%`,
    top: `${(n * 53) % 100}%`,
    size: 1 + (n % 2),
    opacity: 0.2 + (n % 60) / 120,
  };
});

/** 12 glowing dust motes that bob and pulse. */
const MOTES = Array.from({ length: 12 }, (_, i) => {
  const n = (i * 41) % 100;
  return {
    left: `${(n * 7) % 100}%`,
    top: `${(n * 11) % 100}%`,
    duration: 4 + (n % 4),
    delay: (n % 10) * 0.2,
  };
});

/** Light streaks running off the monitor's four corners. */
const STREAKS = [
  { x: "left", y: "top", dir: "to left" },
  { x: "left", y: "bottom", dir: "to left" },
  { x: "right", y: "top", dir: "to right" },
  { x: "right", y: "bottom", dir: "to right" },
] as const;

const CORNERS = [
  "top-2 left-2 border-l border-t",
  "top-2 right-2 border-r border-t",
  "bottom-2 left-2 border-l border-b",
  "bottom-2 right-2 border-r border-b",
];

const SHEEN =
  "linear-gradient(135deg, hsl(var(--space-paper)/0.10) 0%, transparent 28%, transparent 72%, hsl(var(--space-paper)/0.05) 100%)";

const REST_TILT = tiltTransform(0, 0);

const tiltStyle: CSSProperties = {
  transform: REST_TILT,
  transformStyle: "preserve-3d",
  transformOrigin: "50% 50%",
};

/** Position of poster `index` (of `count`) on the reel's curved arc. */
function arcTransform(index: number, count: number, row: number): string {
  const angle = ((index - (count - 1) / 2) / count) * 1.7;
  const x = Math.sin(angle) * 270;
  const z = -Math.cos(angle) * 270 + 148.5;
  const y = row * 108;
  const rotate = -(angle * 180) / Math.PI;
  return `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotate}deg)`;
}

/**
 * The tilted "LIVE · REEL COSMOS" monitor: a curved reel of posters drifting in
 * a dark 3D tunnel, with an "Enter 3D space" bar beneath it.
 */
export function Space3DPreview({
  posters,
  onEnter,
  heading,
}: {
  posters: string[];
  onEnter: () => void;
  heading?: ReactNode;
}) {
  const reel = posters.slice(0, 11);
  const rootRef = useRef<HTMLDivElement>(null);
  const [tilt] = useState(createTiltSpring);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    tilt.setNodes(Array.from(root.querySelectorAll<HTMLElement>("[data-tilt]")));
    return () => tilt.stop();
  }, [tilt]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const spanX = Math.max(rect.width, 600);
    const spanY = Math.max(rect.height, 500);
    tilt.setTarget(
      Math.max(-1, Math.min(1, (event.clientX - centerX) / spanX)),
      Math.max(-1, Math.min(1, (event.clientY - centerY) / spanY)),
    );
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => tilt.setTarget(0, 0)}
      className={`vp-stage${inView ? " is-in-view" : ""} relative flex items-end justify-between gap-10 md:gap-20 w-full flex-wrap`}
      style={{ perspective: 2200 }}
    >
      {heading ? (
        <div data-tilt style={tiltStyle} className="relative z-10 will-change-transform">
          <div className="vp-bob">
            {heading}
            <span className="vault-restricted-tag mt-4 inline-block -rotate-2 font-hand text-lg text-accent md:text-xl">
              restricted area
            </span>
          </div>
        </div>
      ) : null}

      {/* Receding grid room behind everything. */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10"
        style={{
          width: 1600,
          height: 900,
          marginLeft: -800,
          marginTop: -450,
          transform: "rotateY(-32deg) rotateX(3deg) translateZ(-260px)",
          transformStyle: "preserve-3d",
          transformOrigin: "100% 50%",
        }}
      >
        <div
          className="vp-wall-grid absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--space-accent)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--space-accent)/0.5) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
            maskImage: "radial-gradient(ellipse 70% 60% at 28% 50%, black 0%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 60% at 28% 50%, black 0%, transparent 80%)",
            opacity: 0.55,
          }}
        />
        <div
          className="vp-floor-grid absolute left-0 right-0 bottom-0"
          style={{
            height: 700,
            transform: "rotateX(78deg) translateZ(0)",
            transformOrigin: "50% 100%",
            backgroundImage:
              "linear-gradient(hsl(var(--space-accent)/0.6) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--space-accent)/0.6) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
            maskImage: "linear-gradient(to top, black 0%, transparent 85%)",
            WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 85%)",
            opacity: 0.6,
          }}
        />
        <div
          className="absolute left-0 right-0 h-px top-1/2"
          style={{
            background:
              "linear-gradient(90deg, transparent, hsl(var(--space-accent)/0.8), transparent)",
            boxShadow: "0 0 30px hsl(var(--space-accent)/0.6)",
          }}
        />
      </div>

      <div data-tilt style={tiltStyle} className="relative w-[340px] md:w-[480px] will-change-transform">
        <div className="vp-bob relative">
          {STREAKS.map((streak) => (
            <div
              key={`${streak.x}-${streak.y}`}
              className="pointer-events-none absolute h-px z-0"
              style={{
                width: 560,
                [streak.x]: "100%",
                [streak.y]: 0,
                background: `linear-gradient(${streak.dir}, hsl(var(--space-accent)/0.85), transparent)`,
                boxShadow: "0 0 14px hsl(var(--space-accent)/0.55)",
              }}
            />
          ))}

          <button
            type="button"
            onClick={onEnter}
            data-cursor="link"
            className="vp-monitor group relative w-full rounded-[22px] overflow-hidden text-left block cursor-pointer"
            style={{
              background: "radial-gradient(ellipse at 38% 55%, #1c1511 0%, #0a0706 62%, #000 100%)",
              boxShadow:
                "0 60px 140px -30px rgba(0,0,0,0.78), -50px 40px 120px -20px hsl(var(--space-accent)/0.45), inset 0 0 0 1px hsl(var(--space-accent)/0.28)",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 rounded-[22px]"
              style={{ background: SHEEN }}
            />

            <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2 border-b border-background/10">
              <div className="flex items-center gap-2">
                <span className="relative flex">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--space-accent))]" />
                  <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-70" />
                </span>
                <span className="text-[8px] tracking-[0.4em] uppercase text-background/70 font-sans">
                  Live · Reel Cosmos
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[8px] tracking-[0.3em] uppercase text-background/40 font-sans tabular-nums">
                  REC · 04:21:18
                </span>
                <Orbit className="w-3 h-3 text-background/50" />
              </div>
            </div>

            <div
              className="relative h-[250px] md:h-[290px] overflow-hidden"
              style={{ perspective: 1100, perspectiveOrigin: "62% 50%" }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 60% at 60% 50%, hsl(25 30% 8% / 0.9), hsl(20 25% 4%) 70%, #000 100%)",
                }}
              />
              <div className="absolute inset-0">
                {STARS.map((star, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full bg-background"
                    style={{
                      left: star.left,
                      top: star.top,
                      width: star.size,
                      height: star.size,
                      opacity: star.opacity,
                    }}
                  />
                ))}
              </div>
              <div
                className="absolute"
                style={{
                  left: "22%",
                  top: "42%",
                  width: 260,
                  height: 260,
                  marginLeft: -130,
                  marginTop: -130,
                  background: "radial-gradient(circle, hsl(var(--space-accent) / 0.42), transparent 65%)",
                  filter: "blur(24px)",
                }}
              />
              <div
                className="absolute"
                style={{
                  left: "82%",
                  top: "55%",
                  width: 220,
                  height: 220,
                  marginLeft: -110,
                  marginTop: -110,
                  background: "radial-gradient(circle, hsl(var(--space-primary) / 0.3), transparent 70%)",
                  filter: "blur(28px)",
                }}
              />

              {/* Tunnel: scrolling floor and ceiling grids around a glowing horizon. */}
              <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
                <div
                  className="vp-tunnel-floor absolute left-1/2 top-[68%]"
                  style={{
                    width: 2400,
                    height: 1400,
                    marginLeft: -1200,
                    transform: "rotateX(72deg) translateZ(0px)",
                    transformOrigin: "50% 0%",
                    backgroundImage:
                      "linear-gradient(hsl(var(--space-accent)/0.55) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--space-accent)/0.45) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                    maskImage:
                      "linear-gradient(to bottom, transparent 0%, black 18%, black 70%, transparent 100%), radial-gradient(ellipse at 50% 0%, black 35%, transparent 75%)",
                    WebkitMaskImage:
                      "linear-gradient(to bottom, transparent 0%, black 18%, black 70%, transparent 100%), radial-gradient(ellipse at 50% 0%, black 35%, transparent 75%)",
                    maskComposite: "intersect",
                    WebkitMaskComposite: "source-in",
                    opacity: 0.7,
                  }}
                />
                <div
                  className="vp-tunnel-ceiling absolute left-1/2 top-[32%]"
                  style={{
                    width: 2400,
                    height: 1400,
                    marginLeft: -1200,
                    transform: "rotateX(-72deg) translateZ(0px)",
                    transformOrigin: "50% 100%",
                    backgroundImage:
                      "linear-gradient(hsl(var(--space-accent)/0.28) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--space-accent)/0.22) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                    maskImage:
                      "linear-gradient(to top, transparent 0%, black 22%, black 70%, transparent 100%)",
                    WebkitMaskImage:
                      "linear-gradient(to top, transparent 0%, black 22%, black 70%, transparent 100%)",
                    opacity: 0.45,
                    bottom: "auto",
                  }}
                />
                <div
                  className="absolute left-0 right-0 h-px"
                  style={{
                    top: "50%",
                    background:
                      "linear-gradient(90deg, transparent, hsl(var(--space-accent)/0.9), transparent)",
                    boxShadow:
                      "0 0 24px hsl(var(--space-accent)/0.7), 0 0 60px hsl(var(--space-accent)/0.4)",
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: "50%",
                    top: "50%",
                    width: 90,
                    height: 90,
                    marginLeft: -45,
                    marginTop: -45,
                    background: "radial-gradient(circle, hsl(var(--space-accent)/0.55), transparent 70%)",
                    filter: "blur(10px)",
                  }}
                />
              </div>

              {/* Curved reel: three rows of posters swaying on the Y axis. */}
              <div className="vp-carousel absolute left-1/2 top-1/2" style={{ transformStyle: "preserve-3d" }}>
                {ROWS.map((row, rowIndex) =>
                  reel.map((src, i) => (
                    <div
                      key={`${rowIndex}-${i}`}
                      className="absolute rounded-md overflow-hidden"
                      style={{
                        width: 54,
                        height: 96,
                        marginLeft: -54 / 2,
                        marginTop: -96 / 2,
                        transform: arcTransform(i, reel.length, row),
                        backfaceVisibility: "hidden",
                        boxShadow: "0 10px 26px rgba(0,0,0,0.7), 0 0 0 1px hsl(var(--space-accent) / 0.3)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    </div>
                  )),
                )}
                <div
                  className="absolute"
                  style={{
                    width: 5,
                    height: 5,
                    marginLeft: -2.5,
                    marginTop: -2.5,
                    background: "hsl(var(--space-accent))",
                    borderRadius: "50%",
                    boxShadow: "0 0 18px hsl(var(--space-accent)), 0 0 50px hsl(var(--space-accent) / 0.55)",
                  }}
                />
              </div>

              {MOTES.map((mote, i) => (
                <div
                  key={`d${i}`}
                  className="vp-mote absolute rounded-full"
                  style={{
                    left: mote.left,
                    top: mote.top,
                    width: 2,
                    height: 2,
                    background: "hsl(var(--space-accent))",
                    boxShadow: "0 0 6px hsl(var(--space-accent))",
                    opacity: 0.6,
                    animationDuration: `${mote.duration}s`,
                    animationDelay: `${mote.delay}s`,
                  }}
                />
              ))}

              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 65% 50% at 50% 55%, transparent 0%, hsl(20 35% 5% / 0.5) 60%, hsl(20 40% 4% / 0.92) 100%)",
                  mixBlendMode: "multiply",
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse 40% 30% at 50% 50%, hsl(var(--space-accent) / 0.18), transparent 70%)",
                  mixBlendMode: "screen",
                }}
              />
              <div
                className="vp-scan absolute inset-x-0 h-px pointer-events-none"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, hsl(var(--space-accent) / 0.75), transparent)",
                }}
              />
              {CORNERS.map((corner) => (
                <span key={corner} className={`absolute w-3 h-3 border-accent/70 ${corner}`} />
              ))}
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/10 backdrop-blur-md border border-accent/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-[8px] tracking-[0.3em] uppercase text-background font-sans">
                  Enter
                </span>
                <ArrowUpRight className="w-2.5 h-2.5 text-accent" />
              </div>
            </div>

            <div className="relative z-10 px-4 py-3 border-t border-background/10 bg-foreground/[0.3] backdrop-blur-md">
              <p className="font-serif italic text-background text-base leading-tight">
                Drift through the work.
              </p>
              <div className="mt-2 flex items-center gap-4 text-background/60 text-[8px] tracking-[0.3em] uppercase">
                <span className="flex items-center gap-1.5">
                  <Move3d className="w-2.5 h-2.5 text-accent" /> Drag · WASD
                </span>
                <span className="flex items-center gap-1.5">
                  <MousePointerClick className="w-2.5 h-2.5 text-accent" /> Click to enter
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={onEnter}
            data-cursor="link"
            className="group/btn relative w-full mt-3 rounded-2xl overflow-hidden cursor-pointer text-left"
            style={{
              background: "linear-gradient(180deg, hsl(20 30% 8%) 0%, hsl(20 25% 4%) 100%)",
              boxShadow:
                "0 30px 60px -20px rgba(0,0,0,0.7), inset 0 0 0 1px hsl(var(--space-accent)/0.35)",
            }}
          >
            <span
              className="pointer-events-none absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500"
              style={{
                background:
                  "radial-gradient(circle at 30% 50%, hsl(var(--space-accent)/0.35), transparent 70%)",
              }}
            />
            <span className="relative z-10 flex items-center justify-between px-5 py-3.5 md:py-4">
              <span className="flex items-center gap-3">
                <Orbit className="w-4 h-4 text-accent" />
                <span className="text-[10px] md:text-xs tracking-[0.4em] uppercase font-sans text-background">
                  Enter 3D Space
                </span>
              </span>
              <span className="flex items-center gap-2 text-background/60 group-hover/btn:text-accent transition-colors">
                <span className="text-[9px] tracking-[0.3em] uppercase font-sans">Engage</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </span>
            <span
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{ background: SHEEN }}
            />
          </button>
        </div>
      </div>

      <div
        className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 w-[80%] h-12 blur-2xl opacity-60"
        style={{
          background: "radial-gradient(ellipse, hsl(var(--space-accent)/0.45), transparent 70%)",
        }}
      />
    </div>
  );
}
