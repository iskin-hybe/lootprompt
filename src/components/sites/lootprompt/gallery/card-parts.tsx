"use client";

// Small pieces of the prompt card (source: prompt-card chunk + index brand helpers).
import { Eye, Heart } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { homeAggregates, type Brand, type Orientation, type Prompt, type PromptReference } from "../data";
import { formatCount, prefersReducedMotion, showsCount } from "./lib";
import { stampLabel, type StealStamp } from "./use-steal";

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards (the source's `useEffect(() => set(true))`). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Animates a number from 0 once the element scrolls into view. */
function useCountUp(value: number, duration: number, start: "value" | "zero") {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(start === "value" ? value : 0);
  const shownRef = useRef(shown);
  const ran = useRef(false);

  useEffect(() => {
    shownRef.current = shown;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(value);
      return;
    }
    const animate = () => {
      const from = ran.current ? shownRef.current : 0;
      ran.current = true;
      const t0 = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - (1 - p) ** 3;
        setShown(Math.round(from + (value - from) * eased));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    };
    if (ran.current) return animate();
    let cancel: (() => void) | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          cancel = animate();
        }
      },
      // Extends above the viewport so counters a fast scroll skips past still roll.
      { rootMargin: "100000px 0px 0px 0px", threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancel?.();
    };
  }, [value, duration]);

  return { ref, shown };
}

function CountUp({ value }: { value: number }) {
  const { ref, shown } = useCountUp(value, 520, "value");
  return <span ref={ref}>{formatCount(shown)}</span>;
}

/** Views and likes, each only once it clears its threshold. */
export function Engagement({ prompt }: { prompt: Prompt }) {
  const mounted = useMounted();
  const views = homeAggregates.views[prompt.id] ?? 0;
  const likes = Math.max(0, (prompt.igLikes ?? 0) + (homeAggregates.likes[prompt.id] ?? 0));
  const items: { key: string; node: ReactNode }[] = [];
  if (mounted && showsCount("views", views)) {
    items.push({
      key: "views",
      node: (
        <>
          <Eye className="size-[13px]" strokeWidth={1.25} aria-hidden="true" />
          <CountUp value={views} />
          <span className="sr-only">views</span>
        </>
      ),
    });
  }
  if (mounted && showsCount("likes", likes)) {
    items.push({
      key: "likes",
      node: (
        <>
          <Heart className="size-[13px]" strokeWidth={1.5} aria-hidden="true" />
          <CountUp value={likes} />
          <span className="sr-only">likes</span>
        </>
      ),
    });
  }
  if (items.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-2 font-ui text-[0.68rem] text-muted-foreground">
      {items.map((item, i) => (
        <span key={item.key} className="flex shrink-0 items-center gap-1">
          {i > 0 ? (
            <span aria-hidden="true" className="mr-1 text-[0.6rem] leading-none opacity-60">
              ·
            </span>
          ) : null}
          {item.node}
        </span>
      ))}
    </span>
  );
}

/** Handwritten "N steals" that rolls up when it scrolls into view. */
export function StealCount({ value, ember }: { value: number; ember: boolean }) {
  const mounted = useMounted();
  const { ref, shown } = useCountUp(value, 700, "zero");
  if (!showsCount("steals", value)) return null;
  return (
    <span ref={ref} className="copy-note text-[0.82rem]">
      {mounted && ember ? <span aria-hidden="true" className="ember-dot" /> : null}
      <span>{formatCount(shown)} steals</span>
    </span>
  );
}

export function TrendStamp() {
  return (
    <span className="trend-stamp" aria-label="Most stolen prompts of the last 7 days">
      Trending
    </span>
  );
}

/** Holographic foil + LEGENDARY tag for the top-stolen prompts. */
export function LegendaryFoil() {
  return (
    <>
      <span className="holo-foil" aria-hidden="true">
        <span className="holo-foil-spectrum" />
        <span className="holo-foil-glare" />
      </span>
      <span className="legendary-tag">Legendary</span>
    </>
  );
}

/** "new" circled in ink for posts from the last 48 hours. */
export function FreshInk() {
  const ref = useRef<HTMLSpanElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDrawn(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          setDrawn(true);
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className={`fresh-ink${drawn ? " is-drawn" : ""}`} title="Published in the last 48 hours">
      <span className="fresh-ink-word">new</span>
      <svg viewBox="0 0 64 32" fill="none" aria-hidden="true" preserveAspectRatio="none" className="fresh-ink-circle">
        <path
          d="M40 4.5C24 1.5 8 4 4 12.5C0.5 20 12 28.5 30 29.5C48 30.5 62 25 62 16.5C62 10.5 55 6 46 4.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Little frame showing the media's orientation. */
export function OrientationGlyph({ orientation }: { orientation: Orientation }) {
  const landscape = orientation === "landscape";
  const square = orientation === "square";
  const w = landscape ? 16 : square ? 12 : 8;
  const h = landscape ? 9 : square ? 12 : 14;
  return (
    <svg
      viewBox="0 0 18 16"
      width="16"
      height="14"
      fill="none"
      role="img"
      aria-label={`${orientation} media`}
      className="shrink-0 opacity-55"
    >
      <rect x={(18 - w) / 2} y={(16 - h) / 2} width={w} height={h} rx="1.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export interface MetaItem {
  key: string;
  node: ReactNode;
  className?: string;
  flexible?: boolean;
}

/** Dot-separated meta line under the title. */
export function MetaRow({ items }: { items: (MetaItem | null)[] }) {
  const list = items.filter((item): item is MetaItem => item !== null);
  if (list.length === 0) return null;
  return (
    <div className="meta-row mt-2 text-muted-foreground">
      {list.map((item, i) => (
        <span
          key={item.key}
          className={`meta-item${item.flexible ? " meta-item-flex" : ""}${item.className ? ` ${item.className}` : ""}`}
        >
          {i > 0 ? (
            <span aria-hidden="true" className="meta-sep">
              ·
            </span>
          ) : null}
          {item.node}
        </span>
      ))}
    </div>
  );
}

/** Reference thumbnail: image, or a film tile for motion references. */
export function ReferenceChip({ reference }: { reference: PromptReference }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="w-[72px]">
      {reference.type === "video" ? (
        <span className="reference-chip-film">
          {!failed && reference.src ? (
            <video
              ref={videoRef}
              src={`${reference.src}#t=0.1`}
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => setFailed(true)}
              onLoadedData={(e) => setLoaded(e.currentTarget.videoWidth > 0)}
              onMouseEnter={() => void videoRef.current?.play().catch(() => setFailed(true))}
              onMouseLeave={() => videoRef.current?.pause()}
              className={"size-full object-cover" + (loaded ? "" : " opacity-0")}
            />
          ) : null}
          {loaded ? null : (
            <svg
              className="reference-chip-placeholder"
              viewBox="0 0 48 48"
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="7" y="9" width="34" height="30" rx="3" />
              <path d="M13 9v30M35 9v30M7 16h6M7 24h6M7 32h6M35 16h6M35 24h6M35 32h6M20 19l9 5-9 5z" />
            </svg>
          )}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- local 144px thumbs, no optimisation needed
        <img
          src={reference.src}
          alt={reference.label}
          loading="lazy"
          className="size-[72px] rounded-[10px] border border-[var(--paper-line)] object-cover"
        />
      )}
      <p className="mt-1 truncate font-ui text-[0.62rem] text-muted-foreground">{reference.label}</p>
    </div>
  );
}

/** Brand logo drawn in ink (mask image). */
export function BrandInk({ brand, className }: { brand: Brand; className?: string }) {
  if (!brand.logo_url) {
    return <span className={`brand-ink-fallback ${className ?? ""}`.trim()}>{brand.name}</span>;
  }
  return (
    <span
      aria-hidden="true"
      className={`brand-ink ${className ?? ""}`.trim()}
      style={{ "--brand-logo": `url("${brand.logo_url}")` } as CSSProperties}
    />
  );
}

/** Pill-sized brand logo used by the brand filter. */
export function BrandChip({ brand }: { brand: Brand }) {
  return <BrandInk brand={brand} className="brand-ink-chip" />;
}

/** Tilted "made for <brand>" stamp in the corner of a card's media. */
export function BrandStamp({ brand }: { brand: Brand }) {
  const mounted = useMounted();
  const label = `Made for ${brand.name}`;
  const logo = <BrandInk brand={brand} className="brand-stamp-logo" />;
  if (!brand.link_url || !mounted) {
    return (
      <span className="brand-stamp" title={label} aria-label={label}>
        {logo}
      </span>
    );
  }
  return (
    <a
      href={brand.link_url}
      target="_blank"
      rel="noreferrer sponsored"
      title={label}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className="brand-stamp brand-stamp-link"
    >
      {logo}
      <span className="brand-stamp-tip" aria-hidden="true">
        {label}
      </span>
    </a>
  );
}

/** STOLEN ink stamp slammed onto a card after a steal. */
export function InkStamp({ stamp }: { stamp: StealStamp }) {
  const night = stampLabel() === "NIGHT JOB";
  return (
    <span
      aria-hidden="true"
      className="ink-stamp"
      data-night={night ? "true" : undefined}
      style={{ "--stamp-angle": `${stamp.angle}deg` } as CSSProperties}
    >
      {stampLabel()}
    </span>
  );
}

/** Lucide's (since removed) instagram glyph, as the source ships it. */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/** Padlock over the week's locked vault post. */
export function VaultCover({ href }: { href: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={(e) => e.stopPropagation()}
      className="vault-cover absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-foreground"
      aria-label="Open locked vault"
    >
      <svg viewBox="0 0 48 56" fill="none" aria-hidden="true" className="h-12 w-12">
        <path d="M13 24c-.5-7 1.5-13 11-13s11.5 6 11 13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path
          d="M8.5 24.5c9.5-1.2 21.5-1.2 31 0 1.6 6.5 1.6 15.5 0 22-9.5 1.4-21.5 1.4-31 0-1.7-6.5-1.7-15.5 0-22Z"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M24 33v7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="hand-headline text-2xl">This vault is locked</span>
      <span className="font-ui text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">enter the code</span>
    </Link>
  );
}
