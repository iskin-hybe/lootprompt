// Imperative grid effects from the prompt-card chunk (`Lt` deal/develop, `Rt` scroll lean).
import { inViewport, prefersReducedMotion } from "./lib";

const DEALT_KEY = "lp-grid-dealt";

/** Shared IntersectionObservers keyed by rootMargin (source: `H_`). */
const observers = new Map<string, { io: IntersectionObserver; callbacks: Map<Element, (visible: boolean) => void> }>();

function observe(el: Element, rootMargin: string, callback: (visible: boolean) => void): () => void {
  let entry = observers.get(rootMargin);
  if (!entry) {
    const callbacks = new Map<Element, (visible: boolean) => void>();
    entry = {
      io: new IntersectionObserver(
        (records) => {
          for (const r of records) callbacks.get(r.target)?.(r.isIntersecting);
        },
        { rootMargin },
      ),
      callbacks,
    };
    observers.set(rootMargin, entry);
  }
  entry.callbacks.set(el, callback);
  entry.io.observe(el);
  const current = entry;
  return () => {
    current.callbacks.delete(el);
    current.io.unobserve(el);
  };
}

/**
 * First visit of the session: cards fly in from the grid's top centre like dealt
 * photos. Every card also "develops" (sepia + blur → sharp) the first time it shows.
 */
export function dealGrid(grid: HTMLElement): () => void {
  if (prefersReducedMotion()) return () => {};
  let firstDeal = false;
  try {
    firstDeal = !sessionStorage.getItem(DEALT_KEY);
    if (firstDeal) sessionStorage.setItem(DEALT_KEY, "1");
  } catch {
    // ignore
  }
  const cells = Array.from(grid.children).filter((el): el is HTMLElement => el instanceof HTMLElement);
  const gridBox = grid.getBoundingClientRect();
  let dealt = 0;
  const stops = cells.map((cell) =>
    observe(cell, "120px", (visible) => {
      if (!visible || cell.dataset.developed) return;
      cell.dataset.developed = "1";
      const media = cell.querySelector<HTMLElement>(".cine-media");
      const reveal = cell.querySelector<HTMLElement>(".reveal");
      if (!media) return;
      reveal?.classList.add("grid-developing");
      const deal = firstDeal && inViewport(cell);
      const delay = deal ? dealt++ * 90 : 0;
      const animations: Animation[] = [];
      if (deal) {
        const box = cell.getBoundingClientRect();
        const dx = gridBox.left + gridBox.width / 2 - box.left - box.width / 2;
        const dy = gridBox.top - box.top;
        animations.push(
          cell.animate(
            [
              {
                transform: `translate(${dx}px, ${dy}px) rotate(${dealt % 2 ? 14 : -14}deg) scale(.82)`,
                opacity: 0,
              },
              { transform: "translate(0, -9px) rotate(2deg) scale(1.025)", opacity: 1, offset: 0.78 },
              { transform: "none", opacity: 1 },
            ],
            { duration: 700, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" },
          ),
        );
      }
      animations.push(
        media.animate([{ filter: "sepia(1) contrast(.55) blur(6px)" }, { filter: "none" }], {
          duration: 1400,
          delay,
          easing: "ease-out",
        }),
      );
      void Promise.allSettled(animations.map((a) => a.finished)).then(() =>
        reveal?.classList.remove("grid-developing"),
      );
    }),
  );
  return () => stops.forEach((stop) => stop());
}

/** Cards lean back slightly with scroll velocity (desktop pointers only). */
export function scrollLean(grid: HTMLElement): () => void {
  if (prefersReducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  let lastY = window.scrollY;
  let lastT = performance.now();
  let resetTimer = 0;
  let frame = 0;
  const clear = () => grid.style.removeProperty("--scroll-lean");
  const onScroll = () => {
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      const now = performance.now();
      if (inViewport(grid)) {
        const lean = Math.max(-2, Math.min(2, ((window.scrollY - lastY) / (now - lastT || 16)) * 0.45));
        grid.style.setProperty("--scroll-lean", `${lean.toFixed(2)}deg`);
      }
      lastY = window.scrollY;
      lastT = now;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(clear, 300);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.clearTimeout(resetTimer);
    cancelAnimationFrame(frame);
    clear();
  };
}
