"use client";

import { useEffect, useRef, useState } from "react";
import { promptHref, type Prompt } from "../data";
import { useHolo } from "./use-holo";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** 950 → "950", 1228 → "1.2k", 12_400 → "12k". */
export function formatCount(n: number): string {
  if (n < 1e3) return String(n);
  if (n < 1e6) {
    const k = n / 1e3;
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
  }
  const m = n / 1e6;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.round(m)}m`;
}

/** Engraved rank medallion with laurel sprigs; gleams once when the card scrolls in. */
function MedalStamp({ rank, shine }: { rank: number; shine: boolean }) {
  return (
    <span
      className={`medal-stamp medal-${rank}${shine ? " medal-shine" : ""}`}
      aria-label={`Rank ${rank}`}
      data-rank={rank}
    >
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="size-full">
        <circle cx="32" cy="32" r="17" stroke="currentColor" strokeWidth="2" />
        <circle cx="32" cy="32" r="21" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path
          d="M13 32C11 24 14 17 20 13c-2 7-1 13 3 18"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M51 32c2-8-1-15-7-19 2 7 1 13-3 18"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="20"
          fontWeight="600"
          fill="currentColor"
          fontFamily="ui-sans-serif, system-ui"
        >
          {rank}
        </text>
      </svg>
      <span aria-hidden="true" className="medal-gleam" />
    </span>
  );
}

const MEDIA_CLASS = "size-full object-cover transition-transform duration-700 group-hover:scale-[1.03]";

/** One podium card: medal, playing media with holo foil, model badge, title and steal count. */
export function PodiumCard({
  prompt,
  rank,
  legendary,
}: {
  prompt: Prompt;
  rank: number;
  legendary: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shine, setShine] = useState(false);
  const holo = useHolo(legendary);
  const { media } = prompt;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShine(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Uploaded videos only play while hovered; GIF loops (served as mp4) always play.
  const hoverVideo = media.type === "video";

  return (
    <div
      ref={wrapRef}
      onMouseEnter={() => {
        const video = videoRef.current;
        if (!hoverVideo || !video || prefersReducedMotion()) return;
        video.muted = true;
        video.play().catch(() => {});
      }}
      onMouseLeave={() => {
        if (hoverVideo) videoRef.current?.pause();
      }}
    >
      <a
        href={promptHref(prompt.id)}
        className="podium-card group relative block overflow-hidden rounded-[15px] border border-[var(--paper-line)] bg-[var(--card-surface)]"
      >
        <MedalStamp rank={rank} shine={shine} />
        <div
          className="holo-media relative aspect-[4/5] overflow-hidden bg-[var(--paper-line)]"
          onPointerMove={holo.onPointerMove}
          onPointerLeave={holo.onPointerLeave}
        >
          {hoverVideo ? (
            <video
              ref={videoRef}
              src={media.src}
              poster={media.poster ?? undefined}
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={prompt.title}
              className={MEDIA_CLASS}
            />
          ) : media.motion ? (
            <video
              src={media.motion}
              poster={media.poster ?? media.src}
              autoPlay
              muted
              loop
              playsInline
              aria-label={prompt.title}
              className={MEDIA_CLASS}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.src} alt={prompt.title} loading="lazy" className={MEDIA_CLASS} />
          )}
          {legendary ? (
            <>
              <span className="holo-foil" aria-hidden="true">
                <span className="holo-foil-spectrum" />
                <span className="holo-foil-glare" />
              </span>
              <span className="legendary-tag">Legendary</span>
            </>
          ) : null}
          <span className="model-badge absolute right-3 top-3" title={prompt.model}>
            {prompt.model}
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-ui text-sm leading-snug text-foreground">{prompt.title}</h3>
          <p className="hand-note mt-1 text-lg text-muted-foreground">
            {`stolen ${formatCount(prompt.copyCount)} ${prompt.copyCount === 1 ? "time" : "times"}`}
          </p>
        </div>
      </a>
    </div>
  );
}
