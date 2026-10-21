"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "../../chrome/auth-modal";
import { readStorage, writeStorage } from "../../chrome/use-hydrated";

/** Remembers the panel being opened by hand for this tab session. */
const OPEN_KEY = "loot.newsletter.open";
/** Set once the panel has opened itself near the bottom of a page. */
const AUTO_KEY = "loot.newsletter.auto";
/** Scrolled share of the page (viewport bottom / page height) that opens the panel. */
const AUTO_OPEN_AT = 0.85;

/** Hand-drawn envelope (source crew-promo `_`). */
function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 28" className={className} aria-hidden="true" fill="none">
      <path
        d="M3 6.5c8-1.2 26-1.4 34 .2.7 6 .8 13.4.2 19.3-9 1.3-26 1.2-34.5-.2C2 20 2.2 12.2 3 6.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M3.6 7.2c5.3 5.2 10.6 9 16.4 9.3 5.6.3 11.4-3.7 16.9-9.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * "Get word of new heists" fold-out under the tutorial (source crew-promo `v`).
 * Accounts stay on lootprompt.com, so this is the signed-out variant: its sticker
 * opens the same sign-up modal as the header's "Join the crew".
 * Only rendered on the client (inside LazyMount), so storage reads are safe here.
 */
export function NewsletterBox() {
  const [open, setOpen] = useState(() => readStorage("session", OPEN_KEY) === "1");
  const [signingUp, setSigningUp] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    writeStorage("session", OPEN_KEY, next ? "1" : "0");
  };

  // Opens by itself once per session when the reader nears the end of the page.
  useEffect(() => {
    if (readStorage("session", AUTO_KEY) === "1") return;
    const onScroll = () => {
      const page = document.documentElement;
      if ((window.scrollY + window.innerHeight) / page.scrollHeight < AUTO_OPEN_AT) return;
      writeStorage("session", AUTO_KEY, "1");
      setOpen(true);
      window.removeEventListener("scroll", onScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section aria-label="Newsletter" className="nl-box">
      <button type="button" className="nl-row" aria-expanded={open} onClick={toggle}>
        <span className="nl-icon">
          <EnvelopeIcon className="size-6" />
        </span>
        <span className="nl-title">Get word of new heists</span>
        <span className={`nl-chevron${open ? " is-open" : ""}`} aria-hidden="true">
          ↓
        </span>
      </button>
      <div className={`nl-panel${open ? " is-open" : ""}`}>
        <div className="nl-panel-inner">
          <div className="nl-cta">
            <p className="nl-line">New prompts and tutorials, straight to your inbox when they drop.</p>
            <button type="button" className="btn-sticker" onClick={() => setSigningUp(true)}>
              Sign up &amp; subscribe
            </button>
          </div>
        </div>
      </div>
      {signingUp ? <AuthModal onClose={() => setSigningUp(false)} /> : null}
    </section>
  );
}
