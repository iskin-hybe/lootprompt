"use client";

// Per-visitor state the source keeps in this browser for signed-out guests.
// Keys and window events match lootprompt.com so state carries over.
import { useCallback, useEffect, useMemo, useState } from "react";
import { homeAggregates } from "../data";
import { openCrewGate } from "../shared/crew-gate";
import { isNight } from "./lib";

function readJson<T>(storage: () => Storage, key: string, fallback: T): T {
  try {
    const raw = storage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown): void {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked (private mode, quota) — state just won't persist
  }
}

const local = () => window.localStorage;
const session = () => window.sessionStorage;

/* ---------- Rap sheet: prompts this browser has stolen ---------- */

const STEAL_LOG_KEY = "sabika-kaydi";
const STEAL_LOG_EVENT = "rap-sheet-change";

export interface StealEntry {
  id: string;
  title: string;
  at: number;
  night?: boolean;
}

function readStealLog(): StealEntry[] {
  const list = readJson<unknown>(local, STEAL_LOG_KEY, []);
  if (!Array.isArray(list)) return [];
  return list.filter(
    (e): e is StealEntry =>
      !!e && typeof e.id === "string" && typeof e.title === "string" && typeof e.at === "number",
  );
}

function writeStealLog(entries: StealEntry[]): void {
  writeJson(local, STEAL_LOG_KEY, entries);
  window.dispatchEvent(new CustomEvent(STEAL_LOG_EVENT, { detail: entries }));
}

export function recordStealLocally(id: string, title: string): void {
  const entries = readStealLog();
  const last = entries[entries.length - 1];
  if (last && last.id === id && Date.now() - last.at < 6e4) return;
  const at = Date.now();
  writeStealLog([...entries, { id, title, at, night: isNight(at) }].slice(-500));
}

/** Ids of every prompt this browser has stolen. */
export function useStolenIds(): { ids: Set<string>; hydrated: boolean } {
  const [entries, setEntries] = useState<StealEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydrate from storage after mount so server and client markup agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(readStealLog());
    setHydrated(true);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      setEntries(Array.isArray(detail) ? (detail as StealEntry[]) : readStealLog());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STEAL_LOG_KEY) setEntries(readStealLog());
    };
    window.addEventListener(STEAL_LOG_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(STEAL_LOG_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const ids = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);
  return { ids, hydrated };
}

/* ---------- Steal counter cooldown (one count per prompt per minute) ---------- */

const COPIED_KEY = "copied-prompts";
const STEAL_SESSION_KEY = "steal-count";

/** True when this steal should bump the public counter. */
export function claimStealCount(id: string): boolean {
  const seen = readJson<Record<string, number>>(session, COPIED_KEY, {});
  const now = Date.now();
  if (now - (seen[id] ?? 0) < 6e4) return false;
  seen[id] = now;
  writeJson(session, COPIED_KEY, seen);
  return true;
}

/** Announces a steal to the rest of the page (vault pill, thief overlays). */
export function announceSteal(id: string, title: string): void {
  const count = readJson<number>(session, STEAL_SESSION_KEY, 0) + 1;
  writeJson(session, STEAL_SESSION_KEY, count);
  window.dispatchEvent(new CustomEvent("own-steal", { detail: { promptId: id, title } }));
  window.dispatchEvent(new CustomEvent("vault-steal", { detail: count }));
}

/* ---------- Saves ("My Collection") ---------- */

const COLLECTION_KEY = "koleksiyonum";
const COLLECTION_EVENT = "collection-change";

function readCollection(): string[] {
  const list = readJson<unknown>(local, COLLECTION_KEY, []);
  return Array.isArray(list) ? list.filter((e): e is string => typeof e === "string") : [];
}

function toggleCollection(id: string): boolean {
  const ids = readCollection();
  const had = ids.includes(id);
  const next = had ? ids.filter((x) => x !== id) : [id, ...ids];
  writeJson(local, COLLECTION_KEY, next);
  window.dispatchEvent(new CustomEvent(COLLECTION_EVENT, { detail: next }));
  return !had;
}

export function useCollection() {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIds(readCollection());
    setHydrated(true);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<unknown>).detail;
      setIds(Array.isArray(detail) ? (detail as string[]) : readCollection());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === COLLECTION_KEY) setIds(readCollection());
    };
    window.addEventListener(COLLECTION_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COLLECTION_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggle = useCallback((id: string) => toggleCollection(id), []);
  return { ids, hydrated, toggle, has: (id: string) => ids.includes(id) };
}

/* ---------- Guest gate: which prompts a signed-out visitor may open ---------- */

const ENTRY_POSTS_KEY = "lp-entry-posts";

/** Prompts a guest landed on directly this session stay open to them. */
function entryPosts(): string[] {
  const list = readJson<unknown>(session, ENTRY_POSTS_KEY, []);
  return Array.isArray(list) ? list.filter((e): e is string => typeof e === "string") : [];
}

/** Everything else is crew-only for guests (this clone always browses signed out). */
export function isCrewOnly(id: string): boolean {
  if (typeof window === "undefined") return false;
  return !entryPosts().includes(id);
}

/** Opens the sign-up gate for crew-only prompts; returns true when it did. */
export function gateCrewOnly(id: string): boolean {
  if (!isCrewOnly(id)) return false;
  openCrewGate("gate_card", id);
  return true;
}

/* ---------- Weekly vault lock ---------- */

interface VaultStatus {
  prompt_id?: string;
  hint?: string;
  week_label?: string;
}

const VAULT_OPEN_PREFIX = "vault-open:";
export const VAULT_OPEN_EVENT = "vault-open-change";

/** The week's locked vault post (if any) stays blurred until its code is cracked. */
export function useVaultLock(promptId: string): { locked: boolean } {
  const status = homeAggregates.vault_status as VaultStatus | null;
  const isVault = status?.prompt_id === promptId;
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!isVault) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpened(localStorage.getItem(VAULT_OPEN_PREFIX + promptId) === "1");
    } catch {
      // ignore
    }
    const onOpen = (e: Event) => {
      if ((e as CustomEvent<string>).detail === promptId) setOpened(true);
    };
    window.addEventListener(VAULT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(VAULT_OPEN_EVENT, onOpen);
  }, [isVault, promptId]);

  return { locked: isVault && !opened };
}

/* ---------- Personal strip ("hide for today") ---------- */

const STRIP_KEY = "personal-strip-dismissed";

export function usePersonalStrip() {
  const [dismissedOn, setDismissedOn] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissedOn(localStorage.getItem(STRIP_KEY));
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  return { ready, hidden: dismissedOn === today };
}
