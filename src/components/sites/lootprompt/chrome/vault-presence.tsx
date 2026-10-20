"use client";

import { useEffect, useState } from "react";
import { editorialSmallButton, quietButton, quietIconButton, quietSmallButton } from "./button-classes";
import { BanditFace, ThiefMask, VaultBandit } from "./floor-icons";
import { NotificationBell } from "./notification-bell";
import { DEFAULT_IDENTITY, getThiefIdentity } from "./thief-alias";
import { readStorage, useHydrated, writeStorage } from "./use-hydrated";

// The source fills the floor from a Supabase realtime presence channel. This
// clone shows the floor as captured on 2026-10-17: three other thieves plus you.
const FLOOR_SNAPSHOT = [
  { key: "f3a1c2d4", alias: "Lucky Shadow Walker", mask: "classic", minutesAgo: 124 },
  { key: "9b7e0c51", alias: "Stealthy Keymaster", mask: "phantom", minutesAgo: 37 },
  { key: "5d2f8a90", alias: "Low-Key Keymaster", mask: "phantom", minutesAgo: 36 },
] as const;
/** How long the realtime channel takes to sync after load. */
const SYNC_DELAY_MS = 700;
const MAX_FACES = 5;

const WAVED_KEY = "pda:waved-targets";
const WAVE_TIMES_KEY = "pda:wave-times";
/** At most 10 waves per 10 minutes. */
const WAVE_LIMIT = 10;
const WAVE_WINDOW_MS = 10 * 60 * 1000;

function readList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(readStorage("session", key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Records a wave if the rate limit allows it (source `ce`). */
function recordWave(): boolean {
  const now = Date.now();
  const recent = readList(WAVE_TIMES_KEY)
    .map(Number)
    .filter((at) => Number.isFinite(at) && now - at < WAVE_WINDOW_MS);
  if (recent.length >= WAVE_LIMIT) return false;
  writeStorage("session", WAVE_TIMES_KEY, JSON.stringify([...recent, now].map(String)));
  return true;
}

const timeAgo = (minutes: number) => (minutes === 0 ? "just now" : `${minutes} min ago`);

/**
 * "N thieves in the vault / you: <alias>" pill bottom-left with the "Thieves on
 * the floor" panel, plus the notification bell bottom-right (source `Qm`).
 */
export function VaultPresence() {
  const hydrated = useHydrated();
  const identity = hydrated ? getThiefIdentity() : DEFAULT_IDENTITY;
  const [synced, setSynced] = useState(false);
  const [open, setOpen] = useState(false);
  const [minutesOnFloor, setMinutesOnFloor] = useState(0);
  const [wavedNow, setWavedNow] = useState<string[] | null>(null);
  const waved = wavedNow ?? (hydrated ? readList(WAVED_KEY) : []);

  useEffect(() => {
    const sync = window.setTimeout(() => setSynced(true), SYNC_DELAY_MS);
    const tick = window.setInterval(() => setMinutesOnFloor((m) => m + 1), 60_000);
    return () => {
      window.clearTimeout(sync);
      window.clearInterval(tick);
    };
  }, []);

  const others = synced ? FLOOR_SNAPSHOT : [];
  const count = others.length + 1;
  const faces = Math.min(count, MAX_FACES);
  const extra = count - faces;

  const wave = (key: string) => {
    if (waved.includes(key) || !recordWave()) return;
    const next = [...waved, key];
    setWavedNow(next);
    writeStorage("session", WAVED_KEY, JSON.stringify(next));
  };

  return (
    <>
      <div className="vault-pill">
        <button
          type="button"
          className={`${quietButton} vault-pill-body`}
          aria-expanded={open}
          aria-controls="thieves-floor"
          onClick={() => setOpen((o) => !o)}
        >
          <VaultBandit cheer={false} />
          <span className="vault-faces" aria-hidden="true">
            {Array.from({ length: faces }, (_, i) => (
              <span key={i} className="vault-face">
                <BanditFace />
              </span>
            ))}
            {extra > 0 ? <span className="vault-extra">+{extra}</span> : null}
          </span>
          <span className="vault-pill-copy">
            <span className="vault-text">{count} thieves in the vault</span>
            <span className="vault-alias">you: {identity.alias}</span>
          </span>
          <span className="vault-live-dot" aria-hidden="true" />
          <span className="vault-count-only" aria-hidden="true">
            {count}
          </span>
        </button>
        {open ? (
          <div id="thieves-floor" className="floor-panel" role="dialog" aria-label="Thieves on the floor">
            <div className="floor-panel-heading">
              <div>
                <span className="floor-eyebrow">LIVE / VAULT</span>
                <h2>Thieves on the floor</h2>
              </div>
              <button
                type="button"
                className={quietIconButton}
                aria-label="Close the floor"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="floor-list">
              {others.map((thief) => {
                const hasWaved = waved.includes(thief.key);
                return (
                  <div key={thief.key} className="floor-thief ">
                    <span className="floor-mask">
                      <ThiefMask variant={thief.mask} size={30} />
                    </span>
                    <span className="floor-thief-copy">
                      <strong>{thief.alias}</strong>
                      <small>{timeAgo(thief.minutesAgo + minutesOnFloor)}</small>
                    </span>
                    <button
                      type="button"
                      className={hasWaved ? quietSmallButton : editorialSmallButton}
                      disabled={hasWaved}
                      onClick={() => wave(thief.key)}
                    >
                      {hasWaved ? "Waved" : "Wave"}
                    </button>
                  </div>
                );
              })}
              {/* You re-announce yourself every minute, so you are always "just now". */}
              <div className="floor-thief is-you">
                <span className="floor-mask">
                  <ThiefMask variant={identity.mask} size={30} />
                </span>
                <span className="floor-thief-copy">
                  <strong>you: {identity.alias}</strong>
                  <small>{timeAgo(0)}</small>
                </span>
              </div>
            </div>
            {others.length === 0 ? <p className="floor-empty">The floor is quiet. For now.</p> : null}
          </div>
        ) : null}
      </div>
      <div className="floor-social-corner">
        <NotificationBell />
      </div>
    </>
  );
}
