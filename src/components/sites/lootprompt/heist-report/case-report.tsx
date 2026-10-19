"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthModal } from "../chrome/auth-modal";
import { ThiefAvatarPack } from "../chrome/thief-avatar-pack";
import { heistReport, homeAggregates, promptHref, SITE_ORIGIN, SNAPSHOT_AT } from "../data";
import { resolveAvatarStyle } from "../thieves/thief-avatars";
import {
  count,
  CrimeWave,
  type DailyField,
  FlipCounter,
  formatDay,
  HeatMap,
  NightMoon,
  PoliceRadio,
  GHOST_SM_BUTTON,
  Sparkline,
  timeAgo,
} from "./case-parts";
import "./heist-report.css";

const SNAPSHOT_MS = new Date(SNAPSHOT_AT).getTime();

const TOGGLE_BUTTON =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-ui text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 w-9 case-toggle";

const LINK_BUTTON =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-ui text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-primary underline-offset-4 hover:underline h-9 px-4 py-2 case-join";

const KPI_LABELS = {
  stolen: "Prompts stolen",
  visits: "Vault visits",
  thieves: "Thieves joined",
  prompts: "In the vault",
} as const;

const CATEGORY_KEYS = [
  ["video", "Video"],
  ["photo", "Photo"],
  ["video_photo", "Video + Photo"],
  ["audio", "Audio"],
] as const;

const CASE_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

interface LiveSteal {
  id: string;
  title: string;
  at: string;
}

function categoryKey(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** "The Heist Report" case file: live KPIs with an expandable full report. */
export function CaseReport() {
  const ref = useRef<HTMLElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailsMounted, setDetailsMounted] = useState(false);
  const [range, setRange] = useState<7 | 14>(7);
  // The snapshot moment is "now"; the clock then runs forward from it.
  const [now, setNow] = useState(SNAPSHOT_MS);
  const [extraSteals, setExtraSteals] = useState(0);
  const [lastStealAt, setLastStealAt] = useState<string | null>(null);
  const [hot, setHot] = useState(false);
  const [liveRadio, setLiveRadio] = useState<LiveSteal[]>([]);
  const [signupOpen, setSignupOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(!!entry?.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const live = onScreen && pageVisible;

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setNow(SNAPSHOT_MS + performance.now()), 1000);
    return () => window.clearInterval(id);
  }, [live]);

  // Steals made on this page (or broadcast by the gallery) bump the counters live.
  useEffect(() => {
    const onSteal = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      setExtraSteals((n) => n + 1);
      setLastStealAt(new Date().toISOString());
      setHot(true);
      window.setTimeout(() => setHot(false), 750);
      if (detail && typeof detail === "object") {
        const { promptId, title } = detail as { promptId?: unknown; title?: unknown };
        if (typeof promptId === "string" && typeof title === "string") {
          setLiveRadio((items) =>
            [{ id: promptId, title, at: new Date().toISOString() }, ...items].slice(0, 12),
          );
        }
      }
    };
    window.addEventListener("live-steal", onSteal);
    window.addEventListener("vault-steal", onSteal);
    return () => {
      window.removeEventListener("live-steal", onSteal);
      window.removeEventListener("vault-steal", onSteal);
    };
  }, []);

  const report = heistReport;
  const stats = homeAggregates.stats;
  const stolen = stats.stolen + extraSteals;
  const days = useMemo(() => report.daily.slice(-range), [report.daily, range]);
  const previousDays = report.daily.slice(-range * 2, -range);

  const delta = (field: DailyField) => {
    const current = days.reduce((sum, d) => sum + count(d[field]), 0);
    const before = previousDays.reduce((sum, d) => sum + count(d[field]), 0);
    if (field === "new_thieves") return `+${current - before} vs ${range} before`;
    const pct = before ? Math.round(((current - before) / before) * 100) : current ? 100 : 0;
    return `▲ ${pct}% vs previous ${range}d`;
  };

  const categories = CATEGORY_KEYS.map(([key, label]) => ({
    key,
    label,
    n: count(report.categories.find((c) => categoryKey(c.category) === key)?.n),
  }));
  const hotMax = Math.max(1, ...report.hot_loot.map((l) => count(l.n)));
  const masked = Math.max(0, count(report.steals_7d) - count(report.member_steals_7d));
  const maskedPct = report.steals_7d ? Math.round((masked / report.steals_7d) * 100) : 0;
  const milestone = (Math.floor(stolen / 500) + 1) * 500;
  const pace = report.daily.slice(-7).reduce((sum, d) => sum + count(d.steals), 0) / 7;
  const heat = Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => count(report.heat?.[d]?.[h])),
  );
  const animate = live && open;
  const wanted = report.most_wanted;

  const kpis: [keyof typeof KPI_LABELS, number, DailyField | null][] = [
    ["stolen", stolen, "steals"],
    ["visits", stats.visits, "visits"],
    ["thieves", stats.thieves, "new_thieves"],
    ["prompts", stats.prompts, null],
  ];

  return (
    <section
      ref={ref}
      className={`case-report mx-auto w-full max-w-6xl px-5 pt-8 sm:px-6 ${live ? "is-visible" : ""}`}
      aria-label="The Heist Report"
    >
      <div className="case-file">
        <div className="case-band">
          <svg className="case-dial" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3" fill="none" stroke="currentColor" />
            <path d="M16 3v5M16 24v5M3 16h5M24 16h5M16 13V7" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <div className="case-band-titles">
            <h2>THE HEIST REPORT</h2>
            <span>CASE FILE · {CASE_DATE.format(now).toUpperCase()}</span>
          </div>
          <span className="case-live">
            <i />
            LIVE
          </span>
          <span className="case-last">
            last steal · {timeAgo(lastStealAt ?? report.last_steal_at, now)}
          </span>
          <div className="case-segment" role="group" aria-label="Report period">
            {([7, 14] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={`${GHOST_SM_BUTTON}${range === n ? " is-on" : ""}`}
                aria-pressed={range === n}
                onClick={() => setRange(n)}
              >
                {n}D
              </button>
            ))}
          </div>
        </div>
        <div className="case-body">
          <div className="case-kpis">
            {kpis.map(([key, value, field]) => (
              <div key={key} className={`case-tile ${key === "stolen" && hot ? "is-hot" : ""}`}>
                <span className="case-label">{KPI_LABELS[key]}</span>
                <FlipCounter value={value} active={live} />
                {field ? (
                  <>
                    <span className="case-delta">{delta(field)}</span>
                    <Sparkline days={days} field={field} red={key === "stolen"} active={live} />
                  </>
                ) : (
                  <>
                    <div className="case-categories">
                      {categories.map(({ key: cat, label, n }) => (
                        <span key={cat} style={{ flexGrow: n || 0 }} title={`${label} · ${n}`} />
                      ))}
                    </div>
                    <div className="case-category-labels">
                      {categories.map(({ key: cat, label }) => (
                        <span key={cat}>{label}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="case-now">
            <span className="case-ping" />
            <strong>RIGHT NOW</strong>
            <span>{count(report.last_hour) + extraSteals} steals in the last hour</span>
            <span>{count(report.visitors_today)} visitors today</span>
            {report.record_day ? (
              <span>
                record day {formatDay(report.record_day.day, { month: "short", day: "numeric" })} ·{" "}
                {report.record_day.n}
              </span>
            ) : null}
          </div>
        </div>
        <div
          id="heist-case-details"
          className={`case-collapse ${open ? "is-open" : ""}`}
          aria-hidden={!open}
          inert={!open}
        >
          <div className="case-collapse-inner">
            {detailsMounted ? (
              <div className="case-details">
                <CrimeWave days={days} active={animate} record={report.record_day} />
                <div className={`case-split ${wanted ? "" : "no-wanted"}`}>
                  <HeatMap heat={heat} active={animate} />
                  {wanted ? (
                    <div className="case-wanted">
                      <span className="case-wanted-title">WANTED</span>
                      <p>THIEF OF THE MONTH</p>
                      <span className={`case-stamp ${animate ? "is-active" : ""}`}>AT LARGE</span>
                      <a href={`${SITE_ORIGIN}/h/${encodeURIComponent(wanted.username)}`}>
                        <ThiefAvatarPack
                          seed={wanted.avatar_seed}
                          style={resolveAvatarStyle(wanted.avatar_style, wanted.avatar_seed)}
                          size={64}
                        />
                        <strong>{wanted.display_name || wanted.username}</strong>
                      </a>
                      <span>
                        {wanted.steals} steals · {wanted.badge_count} badges
                      </span>
                      <em className="case-hand">reward: eternal glory</em>
                    </div>
                  ) : null}
                </div>
                <div className="case-panels">
                  <div className="case-section">
                    <h3>Hot loot this week</h3>
                    {report.hot_loot.map((loot, i) => (
                      <a key={loot.id} href={promptHref(loot.id)} className="case-loot">
                        <span>
                          {i + 1}. {loot.title}
                        </span>
                        <b>{loot.n}</b>
                        <span className="case-bar">
                          <i
                            className={i === 0 ? "is-red" : ""}
                            style={{ width: `${(count(loot.n) / hotMax) * 100}%` }}
                          />
                        </span>
                      </a>
                    ))}
                  </div>
                  <div className="case-section">
                    <h3>Masked vs unmasked</h3>
                    <div className="case-donut-wrap">
                      <div
                        className="case-donut"
                        style={{
                          background: `conic-gradient(var(--case-red) ${maskedPct}%, var(--case-ink) ${maskedPct}%)`,
                        }}
                        aria-label={`${maskedPct}%`}
                      >
                        <span>⌁</span>
                      </div>
                      <div>
                        <strong>{masked} masked</strong>
                        <br />
                        <strong>{count(report.member_steals_7d)} unmasked</strong>
                      </div>
                    </div>
                    <p>{maskedPct}% of this week&apos;s steals were anonymous.</p>
                    <p>
                      <button type="button" className={LINK_BUTTON} onClick={() => setSignupOpen(true)}>
                        Join the crew
                      </button>{" "}
                      to get credit.
                    </p>
                  </div>
                  <div className="case-section case-night">
                    <h3>Night jobs</h3>
                    <div className="case-gauge">
                      <svg viewBox="0 0 120 68" role="img" aria-label={`${report.night_pct}%`}>
                        <path
                          d="M10 60 A50 50 0 0 1 110 60"
                          fill="none"
                          stroke="var(--case-line)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          pathLength={100}
                        />
                        <path
                          d="M10 60 A50 50 0 0 1 110 60"
                          fill="none"
                          stroke="var(--case-red)"
                          strokeWidth="12"
                          strokeLinecap="round"
                          pathLength={100}
                          strokeDasharray="100"
                          strokeDashoffset={100 - Math.min(100, count(report.night_pct))}
                          className="case-gauge-fill"
                        />
                      </svg>
                      <NightMoon className={animate ? "case-moon" : ""} size={24} />
                    </div>
                    <strong>{count(report.night_pct)}%</strong>
                    {report.night_pct > 0 ? (
                      <p>1 in {Math.round(100 / report.night_pct)} steals happen after dark</p>
                    ) : null}
                  </div>
                </div>
                <div className="case-section case-milestone">
                  <div className="case-section-head">
                    <h3>Next milestone</h3>
                    <strong>{milestone.toLocaleString("en-US")}</strong>
                  </div>
                  <div className="case-milestone-track">
                    <span style={{ width: `${((stolen % 500) / 500) * 100}%` }} />
                  </div>
                  <p>{milestone - stolen} to go</p>
                  {pace > 0 ? (
                    <p className="case-hand">
                      at this pace the vault cracks in ~{Math.ceil((milestone - stolen) / pace)} days
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        {detailsMounted ? (
          <div className={`case-radio-container ${open ? "is-open" : ""}`}>
            <PoliceRadio items={[...liveRadio, ...report.radio].slice(0, 12)} running={animate} now={now} />
          </div>
        ) : null}
      </div>
      <div className="case-toggle-wrap">
        <button
          type="button"
          className={TOGGLE_BUTTON}
          aria-label={open ? "Close the file" : "Open the case file"}
          aria-expanded={open}
          aria-controls="heist-case-details"
          onClick={() => {
            setDetailsMounted(true);
            setOpen((v) => !v);
          }}
        >
          <ChevronDown />
        </button>
        <span className="case-hand">{open ? "Close the file" : "Open the case file"}</span>
      </div>
      {signupOpen ? <AuthModal onClose={() => setSignupOpen(false)} /> : null}
    </section>
  );
}
