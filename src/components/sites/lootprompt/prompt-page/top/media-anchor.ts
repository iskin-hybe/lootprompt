// The header's media card, shared with the mini-bar (a sibling component) so the
// bar can slide in once the card has scrolled above the viewport (source `V` ref),
// and with the landing check below.
import { useSyncExternalStore } from "react";

let mediaElement: HTMLElement | null = null;
const listeners = new Set<() => void>();

export function setPromptMediaElement(element: HTMLElement | null): void {
  if (mediaElement === element) return;
  mediaElement = element;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePromptMediaElement(): HTMLElement | null {
  return useSyncExternalStore(
    subscribe,
    () => mediaElement,
    () => null,
  );
}

/**
 * Whether `el`, somewhere below the media card, was on screen when the page
 * landed as the source lays it out. The source's card has no size until its GIF
 * loads, so on a direct link its IntersectionObservers first measure everything
 * under the card one card-height higher: that is how its story hint and steal
 * count-up start right on landing even when the loaded card pushes them below the
 * fold. `threshold` is the visible share required, as in IntersectionObserver.
 */
export function inLandingView(el: Element, threshold = 0): boolean {
  const lift = mediaElement?.clientHeight ?? 0;
  const rect = el.getBoundingClientRect();
  const top = Math.max(rect.top - lift, 0);
  const bottom = Math.min(rect.bottom - lift, window.innerHeight);
  const left = Math.max(rect.left, 0);
  const right = Math.min(rect.right, window.innerWidth);
  if (bottom < top || right < left) return false;
  const area = rect.width * rect.height;
  return area === 0 || ((bottom - top) * (right - left)) / area >= threshold;
}
