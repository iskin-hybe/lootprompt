"use client";

import { Box, Lock } from "lucide-react";
import { useState } from "react";
import { SITE_ORIGIN } from "../data";
import { AuthModal } from "./auth-modal";
import { ThemeToggle } from "./theme-toggle";
import { VaultGate } from "./vault-gate";

/** 3D vault shortcut; locked for guests, who get the members-only gate (source `Gh`). */
function VaultNavLink() {
  const [gateOpen, setGateOpen] = useState(false);

  return (
    <>
      <a
        href={`${SITE_ORIGIN}/vault-3d`}
        className="vault-nav-link relative"
        aria-label="The Vault"
        title="Join the crew and unlock 3D prompt stealing."
        onClick={(event) => {
          event.preventDefault();
          setGateOpen(true);
        }}
      >
        <Box aria-hidden="true" />
        <Lock
          className="absolute -bottom-0.5 -right-0.5 !size-3 rounded-full bg-background p-[1px]"
          aria-hidden="true"
        />
      </a>
      {gateOpen ? <VaultGate onClose={() => setGateOpen(false)} /> : null}
    </>
  );
}

/** Guest view of the crew slot: theme toggle and "Join the crew" (source `Ih`). */
function CrewSlot() {
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="crew-slot">
      <ThemeToggle />
      <button type="button" className="crew-button" onClick={() => setJoinOpen(true)}>
        Join the crew
      </button>
      {joinOpen ? <AuthModal onClose={() => setJoinOpen(false)} /> : null}
    </div>
  );
}

/** Fixed top-right actions. */
export function HeaderActions() {
  return (
    <div className="header-actions">
      <VaultNavLink />
      <CrewSlot />
    </div>
  );
}
