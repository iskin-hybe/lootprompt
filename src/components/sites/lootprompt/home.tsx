import { SiteChrome } from "./chrome/site-chrome";
import { CaseReport } from "./heist-report/case-report";
import { DailyVault } from "./daily-vault/daily-vault";
import { DropBanner } from "./daily-vault/drop-banner";
import { SiteFooter } from "./footer/site-footer";
import { CommandPaletteTrigger } from "./gallery/command-palette";
import { Gallery } from "./gallery/gallery";
import { Hero } from "./hero/hero";
import { InstagramPromo } from "./instagram/instagram-promo";
import { JobPanel } from "./job-board/job-panel";
import { MostStolen } from "./most-stolen/most-stolen";
import { InkRule } from "./shared/ink-rule";
import { LazyMount } from "./shared/lazy-mount";
import { PaperMain } from "./shared/paper-main";
import { TopThieves } from "./thieves/top-thieves";
import { VaultPreview } from "./vault-preview/vault-preview";

/** lootprompt.com homepage, section order matching the source. */
export function LootpromptHome() {
  return (
    <>
      <PaperMain>
        <CommandPaletteTrigger />
        <Hero />
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
          <InkRule />
        </div>
        <TopThieves />
        <div className="scroll-rise">
          <JobPanel />
        </div>
        <div className="scroll-rise">
          <CaseReport />
        </div>
        <DailyVault />
        <DropBanner />
        <div className="scroll-rise">
          <VaultPreview />
        </div>
        <div className="scroll-rise">
          <LazyMount minHeight={520}>
            <MostStolen />
          </LazyMount>
        </div>
        <Gallery />
        <div className="scroll-rise">
          <LazyMount minHeight={640}>
            <InstagramPromo />
          </LazyMount>
        </div>
        <SiteFooter />
      </PaperMain>
      <SiteChrome />
    </>
  );
}
