"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthModal, type AuthTab } from "./auth-modal";

/**
 * "The vault is members-only." gate shown to guests who try the 3D vault
 * (source `Uh`). Rendered inline inside the fixed header, like the source, so it
 * shares the header's stacking context.
 */
export function VaultGate({ onClose }: { onClose: () => void }) {
  const [authTab, setAuthTab] = useState<AuthTab | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !authTab) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [authTab, onClose]);

  if (authTab) return <AuthModal initialTab={authTab} onClose={() => setAuthTab(null)} />;

  return (
    <div className="crew-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <section className="crew-modal text-center" onClick={(event) => event.stopPropagation()}>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-[var(--paper-line)] text-foreground">
          <Lock className="size-5" aria-hidden="true" />
        </span>
        <h2 className="hand-headline mt-4 text-3xl">The vault is members-only.</h2>
        <p className="mt-3 font-ui text-sm text-muted-foreground">
          Join the crew and unlock 3D prompt stealing.
        </p>
        <button type="button" className="crew-submit mt-6" onClick={() => setAuthTab("signup")}>
          Join the crew
        </button>
        <button
          type="button"
          className="mt-4 font-ui text-[0.75rem] text-muted-foreground underline underline-offset-4 hover:text-foreground"
          onClick={() => setAuthTab("login")}
        >
          Sign in
        </button>
      </section>
    </div>
  );
}
