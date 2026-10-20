"use client";

// Guest-facing promo strips between the filters and the grid
// (source: crew-promo chunk `T` banner and the personal strip `Dt`).
import { useState } from "react";
import { AuthModal } from "../chrome/auth-modal";
import { usePersonalStrip } from "./stores";

/** "Join the crew — new heists reach you first." banner; its sticker opens the sign-up modal. */
export function CrewPromo() {
  const [signingUp, setSigningUp] = useState(false);
  return (
    <section className="crew-promo" aria-label="Join the crew">
      <div className="crew-promo-copy">
        <p className="crew-promo-line">Join the crew — new heists reach you first.</p>
      </div>
      <div className="crew-promo-actions">
        <button type="button" className="btn-sticker" onClick={() => setSigningUp(true)}>
          Join &amp; subscribe
        </button>
      </div>
      {signingUp ? <AuthModal onClose={() => setSigningUp(false)} /> : null}
    </section>
  );
}

/** One-line reminder that a guest's marks only live in this browser. */
export function GuestNote() {
  const strip = usePersonalStrip();
  if (!strip.ready || strip.hidden) return null;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-4 sm:px-6">
      <p className="font-ui text-[0.68rem] text-muted-foreground">
        Your stolen marks live in this browser only — an account keeps your streak, rank and vault across devices.
      </p>
    </section>
  );
}
