import "./chrome.css";
import { AnimationPauser } from "./animation-pauser";
import { CrewGateHost } from "./crew-gate-host";
import { HeaderActions } from "./header-actions";
import { NightShiftSync } from "./night-shift-sync";
import { PartnerPromo } from "./partner-promo";
import { RouteTransitions } from "./route-transitions";
import { VaultPresence } from "./vault-presence";

/**
 * Fixed UI layered over the page, in the source root's order: header actions,
 * partner tag, crew gate + crew window, vault presence pill + bell; plus the
 * view-transition marker that animates navigations between pages.
 */
export function SiteChrome() {
  return (
    <>
      <RouteTransitions />
      <NightShiftSync />
      <AnimationPauser />
      <HeaderActions />
      <PartnerPromo />
      <CrewGateHost />
      <VaultPresence />
    </>
  );
}
