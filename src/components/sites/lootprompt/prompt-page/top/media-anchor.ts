// The header's media card, shared with the mini-bar (a sibling component) so the
// bar can slide in once the card has scrolled above the viewport (source `V` ref).
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
