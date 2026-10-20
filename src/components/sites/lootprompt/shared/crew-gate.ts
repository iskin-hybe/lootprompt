// Window event the source uses to open the "join the crew" gate dialog.
// The chrome owns the dialog; any section can request it.
export const CREW_GATE_EVENT = "lp:crew-gate";

export interface CrewGateDetail {
  promptId: string | null;
  source: string;
}

export function openCrewGate(source: string, promptId: string | null = null): void {
  window.dispatchEvent(
    new CustomEvent<CrewGateDetail>(CREW_GATE_EVENT, { detail: { promptId, source } }),
  );
}
