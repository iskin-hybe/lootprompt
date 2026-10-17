"use client";

import { useEffect } from "react";

// Looping decorations whose animations pause while off screen (source `U_`);
// lootprompt.css pauses everything under [data-offscreen="1"] and, while the tab
// is hidden, under html[data-tab-hidden].
const LOOPING = [
  ".compare-hint",
  ".vault-pill-body",
  ".vault-live-dot",
  ".vault-bandit-body",
  ".rank-tube-bubble",
  ".daily-safe-art--locked",
  ".ember-dot",
  ".hr-live",
  ".alarm-dot",
  ".badge-platinum",
  ".platinum-mini-badge",
  ".partner-promo",
  ".vault-searchlight-beam",
  ".streak-spark",
].join(",");

/** Marks the tab hidden and looping elements off screen (source `G_`). Renders nothing. */
export function AnimationPauser() {
  useEffect(() => {
    const root = document.documentElement;
    const onVisibility = () => {
      if (document.hidden) root.dataset.tabHidden = "1";
      else delete root.dataset.tabHidden;
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    const watched = new WeakSet<Element>();
    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) delete el.dataset.offscreen;
          else el.dataset.offscreen = "1";
        }
      },
      { rootMargin: "0px" },
    );
    const scan = () => {
      document.querySelectorAll(LOOPING).forEach((el) => {
        if (watched.has(el)) return;
        watched.add(el);
        visibility.observe(el);
      });
    };
    scan();

    // New decorations mount lazily; rescan at most twice a second.
    let pending = 0;
    const mutations = new MutationObserver(() => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        scan();
      }, 500);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      visibility.disconnect();
      mutations.disconnect();
      window.clearTimeout(pending);
    };
  }, []);

  return null;
}
