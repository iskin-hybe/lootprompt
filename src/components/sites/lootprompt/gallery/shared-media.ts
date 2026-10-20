"use client";

// The card whose media morphs into the prompt page's media during the navigation
// view transition (source `Ne`/`Pe` in the prompt-card chunk). It stays set after
// the visit so the same card morphs back when the gallery comes back.
import { useEffect, useState } from "react";

const SHARED_MEDIA_EVENT = "shared-media-change";

let sharedKey: string | null = null;

/**
 * Marks one card instance as the shared element. Keys are `<scope>:<prompt id>`
 * so the same prompt shown twice (grid and Vault of the Day) never claims the
 * `prompt-media` transition name twice.
 */
export function setSharedMedia(key: string): void {
  sharedKey = key;
  window.dispatchEvent(new CustomEvent<string>(SHARED_MEDIA_EVENT, { detail: key }));
}

/** True while this card instance owns the `.shared-media` class. */
export function useSharedMedia(key: string): boolean {
  const [shared, setShared] = useState(() => sharedKey === key);

  useEffect(() => {
    const onChange = (event: Event) => setShared((event as CustomEvent<string>).detail === key);
    window.addEventListener(SHARED_MEDIA_EVENT, onChange);
    return () => window.removeEventListener(SHARED_MEDIA_EVENT, onChange);
  }, [key]);

  return shared;
}
