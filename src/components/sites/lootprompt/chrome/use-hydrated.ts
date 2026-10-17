"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during SSR and hydration, true once the component runs on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** Reads a storage value, treating blocked storage as empty. */
export function readStorage(kind: "local" | "session", key: string): string | null {
  try {
    return (kind === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

/** Writes a storage value, ignoring blocked storage. */
export function writeStorage(kind: "local" | "session", key: string, value: string): void {
  try {
    (kind === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {}
}

export function removeStorage(kind: "local" | "session", key: string): void {
  try {
    (kind === "local" ? window.localStorage : window.sessionStorage).removeItem(key);
  } catch {}
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
