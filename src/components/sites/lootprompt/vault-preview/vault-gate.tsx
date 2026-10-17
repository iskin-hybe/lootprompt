"use client";

import { Lock } from "lucide-react";
import { useEffect } from "react";
import { openCrewGate } from "../shared/crew-gate";

export const VAULT_GATE_LINE = "Join the crew and unlock 3D prompt stealing.";

/** "The vault is members-only." dialog shown to guests who try to enter the 3D vault. */
export function VaultGate({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The source swaps this dialog for its sign-up / sign-in dialog; here the
  // site chrome's crew gate takes over.
  const joinCrew = () => {
    onClose();
    openCrewGate("vault3d");
  };

  return (
    <div className="crew-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <section className="crew-modal text-center" onClick={(event) => event.stopPropagation()}>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-[var(--paper-line)] text-foreground">
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <h2 className="hand-headline mt-4 text-3xl">The vault is members-only.</h2>
        <p className="mt-3 font-ui text-sm text-muted-foreground">{VAULT_GATE_LINE}</p>
        <button type="button" className="crew-submit mt-6" onClick={joinCrew}>
          Join the crew
        </button>
        <button
          type="button"
          className="mt-4 font-ui text-[0.75rem] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={joinCrew}
        >
          Sign in
        </button>
      </section>
    </div>
  );
}
