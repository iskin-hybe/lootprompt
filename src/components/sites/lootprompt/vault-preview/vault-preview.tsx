"use client";

import { Lock } from "lucide-react";
import { useCallback, useState } from "react";
import { prompts } from "../data";
import { LazyMount } from "../shared/lazy-mount";
import { Space3DPreview } from "./space-3d-preview";
import { VAULT_GATE_LINE, VaultGate } from "./vault-gate";

/** Posters on the reel: the 11 most-stolen image prompts. */
const POSTERS = prompts
  .slice()
  .sort((a, b) => b.copyCount - a.copyCount)
  .filter((p) => p.media.type === "image" && p.media.src)
  .slice(0, 11)
  .map((p) => p.media.poster ?? p.media.src);

/** "Step inside the vault" teaser for the 3D vault. Guests get the members-only gate. */
export function VaultPreview() {
  const [gateOpen, setGateOpen] = useState(false);
  const openGate = useCallback(() => setGateOpen(true), []);
  const closeGate = useCallback(() => setGateOpen(false), []);

  return (
    <section
      className="vault-space-scope relative mx-auto w-full max-w-6xl px-5 py-14 sm:px-6 md:py-20"
      aria-labelledby="vault-preview-heading"
    >
      <span
        className="vault-members-tag absolute right-6 top-10 z-20 inline-flex items-center gap-1.5 sm:right-7"
        title={VAULT_GATE_LINE}
      >
        <Lock className="size-3" aria-hidden="true" />
        Members only
      </span>
      <LazyMount minHeight={520}>
        <Space3DPreview
          posters={POSTERS}
          onEnter={openGate}
          heading={
            <h2
              id="vault-preview-heading"
              className="max-w-xs font-serif text-4xl italic text-foreground md:text-6xl"
            >
              Step inside the vault
            </h2>
          }
        />
      </LazyMount>
      {gateOpen ? <VaultGate onClose={closeGate} /> : null}
    </section>
  );
}
