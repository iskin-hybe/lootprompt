"use client";

import { ChevronDown, Moon, UserPlus } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { thievesBoard, type Thief, type ThiefPeriod } from "../data";
import { AuthModal } from "../chrome/auth-modal";
import { thiefHref } from "../shared/member-view";
import { CrownHeistCanvas } from "./crown-heist-canvas";
import { ThiefAvatar } from "./thief-avatar";
import { ThiefBadges } from "./thief-badges";
import "./thieves.css";

const PODIUM_PLACES = [1, 2, 3] as const;
const PERIODS: { id: ThiefPeriod; label: string }[] = [
  { id: "month", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

// shadcn Button class strings as the source renders them (after tailwind-merge).
const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-ui font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";
const GHOST_SM = `${BUTTON_BASE} hover:bg-accent hover:text-accent-foreground h-8 rounded-sm px-3 text-xs`;
const GHOST_EXPAND =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-ui text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 thief-expand";
const EDITORIAL_SM = `${BUTTON_BASE} border border-primary bg-primary text-primary-foreground shadow-none hover:border-accent hover:bg-accent hover:text-accent-foreground h-8 rounded-sm px-3 text-xs thief-follow`;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Counts up from 0 (720ms, ease-out cubic) once `active`; restarts on `resetKey`. */
function useCountUp(value: number, active: boolean, resetKey: string): number {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const animate = active && !prefersReducedMotion();
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (!animate) {
        setDisplay(value);
        return;
      }
      const progress = Math.min(1, Math.max(0, now - start) / 720);
      setDisplay(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, resetKey, value]);

  return display;
}

function Medal({ place }: { place: number }) {
  return (
    <span className="thief-medal" data-place={place} aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path d="M16 4 24 15 32 4l4 18H12L16 4Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="24" cy="29" r="12" stroke="currentColor" strokeWidth="1.8" />
        <path d="M18 29c4-2 8-2 12 0M24 23v12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <text x="24" y="34" textAnchor="middle" fill="currentColor" fontSize="14">
          {place}
        </text>
      </svg>
    </span>
  );
}

function PodiumCrown({ crownRef }: { crownRef: RefObject<SVGSVGElement | null> }) {
  return (
    <svg ref={crownRef} className="thief-crown" viewBox="0 0 54 28" fill="none" aria-hidden="true">
      <path d="m4 8 10 8L26 3l12 13L50 7l-4 17H9L4 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M10 24c12-3 24-3 36 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PodiumCard({
  thief,
  active,
  resetKey,
  heistEnabled,
  cardRef,
  crownRef,
}: {
  thief: Thief;
  active: boolean;
  resetKey: string;
  heistEnabled: boolean;
  cardRef: RefObject<HTMLAnchorElement | null>;
  crownRef: RefObject<SVGSVGElement | null>;
}) {
  const steals = useCountUp(thief.steals, active, resetKey);
  const champion = thief.place === 1;
  return (
    <a
      ref={champion ? cardRef : undefined}
      href={thiefHref(thief.username)}
      className="thief-podium-card"
      data-place={thief.place}
    >
      {champion ? (
        <>
          <CrownHeistCanvas enabled={heistEnabled} cardRef={cardRef} crownRef={crownRef} />
          <PodiumCrown crownRef={crownRef} />
        </>
      ) : null}
      <Medal place={thief.place} />
      <span className="thief-avatar">
        <ThiefAvatar
          style={thief.avatar_style}
          seed={thief.avatar_seed || thief.username}
          size={champion ? 68 : 58}
        />
      </span>
      <span className="thief-name-line">
        <span className="thief-name">{thief.display_name || thief.username}</span>
        <ThiefBadges thief={thief} />
      </span>
      <strong className="thief-count">{steals.toLocaleString("en-US")}</strong>
    </a>
  );
}

/** Guest "Follow" button; following needs an account, so it opens the sign-in dialog. */
function FollowButton({ username }: { username: string }) {
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <span className="thief-follow-wrap is-compact">
      <button
        type="button"
        className={EDITORIAL_SM}
        aria-label={`Follow @${username}`}
        onClick={() => setAuthOpen(true)}
      >
        <UserPlus />
        Follow
      </button>
      {authOpen ? <AuthModal initialTab="login" onClose={() => setAuthOpen(false)} /> : null}
    </span>
  );
}

function CrewList({ thieves }: { thieves: Thief[] }) {
  const top = Math.max(thieves[0]?.steals ?? 1, 1);
  return (
    <ol className="thief-list">
      {thieves.map((thief, index) => (
        <li key={thief.username} className="thief-row" style={{ "--row": index } as CSSProperties}>
          <a href={thiefHref(thief.username)} className="thief-row-link">
            <span className="thief-row-rank">#{thief.place}</span>
            <ThiefAvatar style={thief.avatar_style} seed={thief.avatar_seed || thief.username} size={34} />
            <span className="thief-row-person">
              <span className="thief-row-name">{thief.display_name || thief.username}</span>
              <ThiefBadges thief={thief} />
            </span>
            <span className="thief-bar">
              <span
                className="thief-bar-fill"
                style={{ "--fill": `${(thief.steals / top) * 100}%`, "--row": index } as CSSProperties}
              />
            </span>
            <strong className="thief-row-count">{thief.steals.toLocaleString("en-US")}</strong>
            <span className="thief-night">
              {thief.night_steals > 0 ? (
                <>
                  <Moon aria-hidden="true" /> {thief.night_steals}
                </>
              ) : null}
            </span>
          </a>
          <FollowButton username={thief.username} />
        </li>
      ))}
    </ol>
  );
}

/** "Top Thieves" leaderboard: 3-card podium plus the expandable 50-thief crew list. */
export function TopThieves() {
  const [period, setPeriod] = useState<ThiefPeriod>("month");
  const [crewOpen, setCrewOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const championRef = useRef<HTMLAnchorElement>(null);
  const crownRef = useRef<SVGSVGElement>(null);

  const podium = thievesBoard(period, 3);
  const crew = crewOpen ? thievesBoard(period, 50) : null;

  useEffect(() => {
    // The source's board loads client-side, so its first render has no section
    // and the podium is marked visible right away; the rise + count-up play on
    // mount, not when scrolled into view.
    const frame = requestAnimationFrame(() => setRevealed(true));
    const el = sectionRef.current;
    if (!el) return () => cancelAnimationFrame(frame);
    // Being on screen only gates the crown heist.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(!!entry?.isIntersecting);
        if (entry?.isIntersecting) setRevealed(true);
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 900px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(desktop.matches && !reduced.matches);
    update();
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  if (podium.length < 3) return null;

  return (
    <section
      ref={sectionRef}
      className="top-thieves"
      data-visible={revealed ? "true" : "false"}
      aria-label="Top Thieves leaderboard"
    >
      <div className="top-thieves-head">
        <h2 className="hand-headline">Top Thieves</h2>
        <div className="thief-head-actions">
          <div className="thief-period" role="group" aria-label="Leaderboard period">
            {PERIODS.map(({ id, label }) => (
              <button
                key={id}
                className={GHOST_SM}
                aria-pressed={period === id}
                onClick={() => {
                  setPeriod(id);
                  setCrewOpen(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="thief-podium">
        {PODIUM_PLACES.map((place) => {
          const thief = podium.find((t) => t.place === place) ?? podium[place - 1];
          return thief ? (
            <PodiumCard
              key={`${period}-${thief.username}`}
              thief={thief}
              active={revealed}
              resetKey={period}
              heistEnabled={inView && pageVisible && motionAllowed}
              cardRef={championRef}
              crownRef={crownRef}
            />
          ) : null;
        })}
      </div>
      <button className={GHOST_EXPAND} aria-expanded={crewOpen} onClick={() => setCrewOpen((open) => !open)}>
        {crewOpen ? "Hide the crew" : "See the whole crew"}
        <ChevronDown aria-hidden="true" className={crewOpen ? "rotate-180" : ""} />
      </button>
      <div className="thief-accordion" data-open={crewOpen ? "true" : "false"}>
        <div>{crew ? <CrewList thieves={crew} /> : null}</div>
      </div>
    </section>
  );
}
