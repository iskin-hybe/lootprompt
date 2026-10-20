"use client";

import { useCallback, useEffect, useState } from "react";
import { prompts } from "../data";
import { isCrewOnly } from "../gallery/stores";
import { CREW_GATE_EVENT, openCrewGate, type CrewGateDetail } from "../shared/crew-gate";
import { MEMBER_VIEW } from "../shared/member-view";
import { clearGateTarget, CrewGateDialog } from "./crew-gate-dialog";
import { CrewWindow } from "./crew-window";
import { useHydrated } from "./use-hydrated";

const PROMPT_PATH = /^\/prompt\/([^/?#]+)\/?$/;

/** The prompt id a same-origin link points at, when it opens a prompt page. */
function promptIdFromLink(anchor: HTMLAnchorElement): string | null {
  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const match = PROMPT_PATH.exec(url.pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Guest-only layer (source `Zg`): opens the crew gate on `lp:crew-gate`, turns
 * clicks on prompt links into the gate (posts are crew-only for guests), and
 * shows the "Your thief file is waiting" window while no gate is open.
 * In member view prompt links open normally; the rest stays as for a guest.
 */
export function CrewGateHost() {
  // The source waits for the auth check before treating the visitor as a guest.
  const isGuest = useHydrated();
  const [gate, setGate] = useState<CrewGateDetail | null>(null);

  useEffect(() => {
    const onGate = (event: Event) => setGate((event as CustomEvent<CrewGateDetail>).detail);
    window.addEventListener(CREW_GATE_EVENT, onGate);
    return () => window.removeEventListener(CREW_GATE_EVENT, onGate);
  }, []);

  useEffect(() => {
    if (MEMBER_VIEW) return;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;
      const promptId = promptIdFromLink(anchor);
      if (!promptId || !isCrewOnly(promptId)) return;
      event.preventDefault();
      event.stopPropagation();
      openCrewGate("gate_card", promptId);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const close = useCallback(() => {
    setGate(null);
    clearGateTarget();
  }, []);

  const promptId = gate?.promptId ?? null;
  const prompt = promptId ? (prompts.find((p) => p.id === promptId) ?? null) : null;

  if (!isGuest) return null;

  return (
    <>
      {gate ? (
        <CrewGateDialog
          prompt={prompt}
          total={prompts.length}
          source={gate.source}
          onClose={close}
        />
      ) : null}
      {gate ? null : <CrewWindow onJoin={() => openCrewGate("home_bubble")} />}
    </>
  );
}
