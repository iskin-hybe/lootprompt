// Ink drops fly from the steal control to the crew avatar (or the floor bell), which then
// pops with a hand-written "+1" (source chunk loot-flight, `flyLootToBag`, run on every
// steal). Styles: `.loot-flight-*` in panel.css.
import { prefersReducedMotion } from "../../gallery/lib";

interface Point {
  x: number;
  y: number;
}

const BAG_TARGETS = [".header-actions .crew-avatar-button", ".floor-bell"];
const MAX_CONCURRENT = 2;

let running = 0;
let overlay: HTMLDivElement | null = null;

function isVisible(el: Element): boolean {
  const box = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function center(el: Element): Point {
  const box = el.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/** Where the steal happened: the focused control, a hovered button, or the viewport centre. */
export function lootOrigin(): Point {
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (active?.closest(".palette-panel")) {
    const row = document.querySelector(".palette-panel [data-index] button:hover");
    if (row && isVisible(row)) return center(row);
  }
  if (active && active !== document.body && isVisible(active)) return center(active);
  const hovered = document.querySelector("button:hover, [role='button']:hover, .cine-stage:hover, .palette-panel:hover");
  return hovered && isVisible(hovered) ? center(hovered) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

function bagTarget(): { element: HTMLElement | null; point: Point } {
  for (const selector of BAG_TARGETS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && isVisible(el)) return { element: el, point: center(el) };
  }
  return { element: null, point: { x: Math.max(24, window.innerWidth - 42), y: 42 } };
}

function flightOverlay(): HTMLDivElement {
  if (overlay?.isConnected) return overlay;
  overlay = document.createElement("div");
  overlay.className = "loot-flight-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.append(overlay);
  return overlay;
}

async function popBag(element: HTMLElement | null, point: Point): Promise<void> {
  const done: Promise<unknown>[] = [];
  if (element) {
    done.push(
      element.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.18)", offset: 0.38 },
          { transform: "scale(0.95)", offset: 0.7 },
          { transform: "scale(1)" },
        ],
        { duration: 300, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      ).finished,
    );
  }
  const plusOne = document.createElement("span");
  plusOne.className = "loot-flight-plus-one";
  plusOne.textContent = "+1";
  plusOne.style.left = `${point.x}px`;
  plusOne.style.top = `${point.y}px`;
  flightOverlay().append(plusOne);
  const rise = plusOne.animate(
    [
      { transform: "translate(-50%, -20%)", opacity: 0 },
      { transform: "translate(-50%, -70%)", opacity: 1, offset: 0.25 },
      { transform: "translate(-50%, -150%)", opacity: 0 },
    ],
    { duration: 520, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
  rise.finished.finally(() => plusOne.remove()).catch(() => {});
  done.push(rise.finished);
  await Promise.allSettled(done);
}

async function blinkBag(element: HTMLElement | null): Promise<void> {
  if (!element) return;
  await element
    .animate([{ opacity: 1 }, { opacity: 0.62 }, { opacity: 1 }], { duration: 360, easing: "ease-out" })
    .finished.catch(() => {});
}

/** Pass `origin` when the steal control has already re-rendered since the steal. */
export async function flyLootToBag(origin: Point = lootOrigin()): Promise<void> {
  if (window.location.pathname.startsWith("/vault-3d") || running >= MAX_CONCURRENT) return;
  const bag = bagTarget();
  if (prefersReducedMotion()) {
    running += 1;
    try {
      await blinkBag(bag.element);
    } finally {
      running = Math.max(0, running - 1);
    }
    return;
  }

  running += 1;
  const layer = flightOverlay();
  const count = 10 + Math.floor(Math.random() * 5);
  const drops: HTMLSpanElement[] = [];
  const flights: Animation[] = [];
  for (let i = 0; i < count; i += 1) {
    const drop = document.createElement("span");
    const size = 5 + Math.random() * 4;
    const jitterX = (Math.random() - 0.5) * 24;
    const jitterY = (Math.random() - 0.5) * 18;
    const dx = bag.point.x - origin.x;
    const dy = bag.point.y - origin.y;
    const swayX = (Math.random() - 0.5) * 180;
    const lift = 55 + Math.random() * 120;
    const spin = (Math.random() - 0.5) * 240;
    drop.className = i % 3 === 0 ? "loot-flight-drop is-cream" : "loot-flight-drop";
    drop.style.width = `${size}px`;
    drop.style.height = `${size * (0.78 + Math.random() * 0.35)}px`;
    drop.style.left = `${origin.x + jitterX}px`;
    drop.style.top = `${origin.y + jitterY}px`;
    drop.style.borderRadius = `${40 + Math.random() * 25}% ${55 + Math.random() * 20}% ${42 + Math.random() * 22}% ${50 + Math.random() * 20}%`;
    layer.append(drop);
    drops.push(drop);
    flights.push(
      drop.animate(
        [
          { transform: "translate(0, 0) rotate(0deg) scale(0.65)", opacity: 0 },
          {
            transform: `translate(${dx * 0.42 + swayX}px, ${dy * 0.3 - lift}px) rotate(${spin * 0.45}deg) scale(1)`,
            opacity: 1,
            offset: 0.42,
          },
          { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(0.35)`, opacity: 0 },
        ],
        { duration: 540, delay: i * 9, easing: "cubic-bezier(0.55, 0.05, 0.8, 0.4)", fill: "forwards" },
      ),
    );
  }

  try {
    await Promise.allSettled(flights.map((flight) => flight.finished));
    drops.forEach((drop) => drop.remove());
    await popBag(bag.element, bag.point);
  } finally {
    drops.forEach((drop) => drop.remove());
    running = Math.max(0, running - 1);
    if (running === 0 && overlay?.childElementCount === 0) {
      overlay.remove();
      overlay = null;
    }
  }
}
