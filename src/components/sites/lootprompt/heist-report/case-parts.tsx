"use client";

import { useEffect, useRef, useState } from "react";
import { promptHref, type HeistReport } from "../data";

export type DailyRow = HeistReport["daily"][number];
export type DailyField = "steals" | "visits" | "new_thieves";

export const GHOST_SM_BUTTON =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-ui font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-8 rounded-sm px-3 text-xs";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const METRIC_LABELS: Record<DailyField, string> = {
  steals: "Steals",
  visits: "Visits",
  new_thieves: "New thieves",
};

const RADIO_LINES = [
  (title: string, ago: string) => `10-31 in progress: "${title}" lifted from the vault · ${ago}`,
  (title: string) => `Unit 7 reports: "${title}" gone — suspect wore a mask`,
  (title: string) => `All units: "${title}" taken, trail goes cold`,
];

/** Non-negative number, treating junk as 0. */
export const count = (value: unknown) => Math.max(0, Number(value) || 0);

/** Formats a YYYY-MM-DD day at local noon (so the date never shifts). */
export function formatDay(day: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(`${day.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? day : new Intl.DateTimeFormat("en-US", options).format(date);
}

/** "26m ago" style relative time against `now`. */
export function timeAgo(iso: string | null, now: number): string {
  if (!iso) return "—";
  const secs = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (!Number.isFinite(secs)) return "—";
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Split-flap counter: changed digits spin through 10 values when the number changes. */
export function FlipCounter({ value, active }: { value: number; active: boolean }) {
  const target = Math.floor(value).toLocaleString("en-US");
  const [flip, setFlip] = useState<{ from: string; to: string; step: number } | null>(null);
  const settled = useRef(target);

  useEffect(() => {
    if (!active) {
      settled.current = target;
      return;
    }
    if (settled.current === target) return;
    const from = settled.current;
    settled.current = target;
    if (reducedMotion()) return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      setFlip({ from, to: target, step: tick });
      if (tick >= 11) window.clearInterval(id);
    }, 60);
    return () => {
      window.clearInterval(id);
      setFlip((f) => (f ? { ...f, step: 11 } : f));
    };
  }, [target, active]);

  const current = active && flip?.to === target ? flip : null;
  const step = current?.step ?? 0;
  const from = current?.from ?? target;
  const changed = current
    ? [...target].flatMap((ch, i) => (ch !== from[i] && ch !== "," ? [i] : []))
    : [];
  const shown =
    current && step < 11
      ? [...target]
          .map((ch, i) => (ch === "," || from[i] === ch ? ch : String((Number(ch) + step) % 10)))
          .join("")
      : target;

  return (
    <div className="case-flap" aria-label={target}>
      {[...shown].map((ch, i) => (
        <span
          key={`${i}-${step}`}
          className={
            ch === ","
              ? "case-digit case-comma"
              : `case-digit ${step && changed.includes(i) ? "case-flipping" : ""}`
          }
          style={{ animationDelay: `${i * 60}ms` }}
          aria-hidden="true"
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

/** Tiny trend line for a KPI tile, with a dot on the peak. */
export function Sparkline({
  days,
  field,
  red,
  active,
}: {
  days: DailyRow[];
  field: DailyField;
  red: boolean;
  active: boolean;
}) {
  const values = days.map((d) => count(d[field]));
  const max = Math.max(1, ...values);
  const x = (i: number) => (values.length === 1 ? 70 : (i * 140) / Math.max(1, values.length - 1));
  const points = values.map((v, i) => `${x(i)},${29 - (v / max) * 26}`).join(" ");
  const peak = values.indexOf(Math.max(...values));
  return (
    <svg
      className={`case-spark ${red ? "is-red" : ""} ${active ? "is-active" : ""}`}
      viewBox="0 0 140 32"
      preserveAspectRatio="none"
      role="img"
      aria-label={`${field} trend`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
      />
      <circle cx={x(peak)} cy={29 - ((values[peak] ?? 0) / max) * 26} r="3" className="case-peak" />
    </svg>
  );
}

/** "The crime wave" bar chart with a steals / visits / new thieves switch. */
export function CrimeWave({
  days,
  active,
  record,
}: {
  days: DailyRow[];
  active: boolean;
  record: HeistReport["record_day"] | null;
}) {
  const [metric, setMetric] = useState<DailyField>("steals");
  const max = Math.max(1, ...days.map((d) => count(d[metric])));
  const peak = days.findIndex((d) => count(d[metric]) === max);
  const labelEvery = Math.max(1, Math.floor(days.length / 5));
  return (
    <div className="case-section case-wave">
      <div className="case-section-head">
        <h3>The crime wave</h3>
        <div className="case-chips" role="group" aria-label="Chart metric">
          {(["steals", "visits", "new_thieves"] as const).map((key) => (
            <button
              key={key}
              type="button"
              className={`${GHOST_SM_BUTTON}${metric === key ? " is-on" : ""}`}
              aria-pressed={metric === key}
              onClick={() => setMetric(key)}
            >
              {METRIC_LABELS[key]}
            </button>
          ))}
        </div>
      </div>
      <div className="case-chart" role="img" aria-label="The crime wave">
        {days.map((day, i) => (
          <div
            key={day.day}
            className="case-chart-col"
            title={`${formatDay(day.day, { month: "short", day: "numeric" })} · ${day[metric]} ${METRIC_LABELS[metric].toLowerCase()}`}
          >
            <div className="case-chart-track">
              <span
                className={`case-chart-bar ${i === peak ? "is-peak" : ""} ${active ? "is-active" : ""}`}
                style={{
                  height: `${Math.max(3, (count(day[metric]) / max) * 100)}%`,
                  animationDelay: `${i * 40}ms`,
                }}
              />
              {i === peak ? (
                <span className="case-chart-note">
                  {record?.day === day.day && record.n === max
                    ? `record heist! ${max}`
                    : `peak · ${max}`}
                </span>
              ) : null}
            </div>
            <span className="case-date">
              {i % labelEvery === 0 || i === days.length - 1
                ? formatDay(day.day, { month: "short", day: "numeric" })
                : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 7×24 grid of steals by weekday and hour, with the prime-time cell in red. */
export function HeatMap({ heat, active }: { heat: number[][]; active: boolean }) {
  const flat = heat.flat().map(count);
  const max = Math.max(1, ...flat);
  const peakIndex = flat.indexOf(Math.max(...flat));
  const peakDay = Math.floor(peakIndex / 24);
  const peakHour = peakIndex % 24;
  return (
    <div className="case-section case-heat">
      <h3>When the vault gets hit</h3>
      <div className="case-heat-scroll">
        <div className="case-heat-grid">
          <span />
          {[0, 6, 12, 18].map((hour) => (
            <span key={hour} className="case-heat-time" style={{ gridColumn: `${hour + 2} / span 6` }}>
              {String(hour).padStart(2, "0")}
            </span>
          ))}
          {WEEKDAYS.map((dayName, d) => (
            <div key={dayName} className="case-heat-row">
              <span className="case-heat-day">{dayName.slice(0, 3)}</span>
              {Array.from({ length: 24 }, (_, h) => {
                const n = heat[d]?.[h] ?? 0;
                return (
                  <span
                    key={h}
                    className={`case-heat-cell ${d * 24 + h === peakIndex && n ? "is-peak" : ""} ${active ? "is-active" : ""}`}
                    style={{
                      opacity: 0.08 + (0.85 * count(n)) / max,
                      animationDelay: `${300 + (h + d) * 28}ms`,
                    }}
                    title={`${dayName} ${String(h).padStart(2, "0")}:00 · ${n} steals`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {flat.some(Boolean) ? (
        <p className="case-hand case-insight">
          {WEEKDAYS[peakDay]} at {String(peakHour).padStart(2, "0")}:00 is prime time
        </p>
      ) : null}
    </div>
  );
}

/** Police-scanner ticker that types out the latest steals, one every 5 seconds. */
export function PoliceRadio({
  items,
  running,
  now,
}: {
  items: HeistReport["radio"];
  running: boolean;
  now: number;
}) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState({ line: "", n: 0 });
  const item = items[index % items.length];
  const line = item
    ? RADIO_LINES[index % 3](item.title, timeAgo(item.at, now - (now % 5000)))
    : "No reports on the wire.";

  useEffect(() => {
    if (!running || !items.length) return;
    const id = window.setInterval(() => setIndex((i) => i + 1), 5000);
    return () => window.clearInterval(id);
  }, [running, items.length]);

  useEffect(() => {
    if (!running) return;
    const instant = reducedMotion();
    const id = window.setInterval(
      () =>
        setTyped((prev) => ({
          line,
          n: instant ? line.length : Math.min(line.length, (prev.line === line ? prev.n : 0) + 1),
        })),
      22,
    );
    return () => window.clearInterval(id);
  }, [line, running]);

  const shownChars = running ? (typed.line === line ? typed.n : 0) : line.length;

  return (
    <div className="case-radio">
      <span className="case-radio-tag">RADIO</span>
      {item ? (
        <a href={promptHref(item.id)} className="case-radio-link" title={line}>
          {line.slice(0, shownChars)}
          <span className="case-caret" />
        </a>
      ) : (
        <span>{line}</span>
      )}
    </div>
  );
}

/** Crescent moon used on the night-jobs gauge. */
export function NightMoon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15.6 3.4c-4.6.6-7.9 4.2-7.6 8.6.3 4.2 3.8 7.5 8.2 7.6-2 1.4-4.6 1.9-7 1.1C5.6 19.5 3.3 16 3.6 12.2 4 7.6 8.1 3.7 13.2 3.2c.8-.1 1.6-.1 2.4.2Z" />
      <path d="M18.4 5.1c.5.5.9 1.1 1.2 1.8" opacity="0.7" />
    </svg>
  );
}
