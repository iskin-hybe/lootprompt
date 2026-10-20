import type { Prompt } from "../data";
import type { PromptDetail } from "../prompt-details";
import { PromptBottom } from "./bottom/prompt-bottom";
import { PromptKeepBrowsing } from "./bottom/keep-browsing";
import { PromptPageProvider } from "./context";
import { PromptPanel } from "./panel/prompt-panel";
import { PromptHeader } from "./top/prompt-header";
import { PromptReadingChrome } from "./top/reading-chrome";
import { PromptTutorial } from "./tutorial/prompt-tutorial";
import "./prompt-page.css";

/** lootprompt.com/prompt/:id as a signed-in member sees it (source route `Xe`). */
export function PromptPage({ prompt, detail }: { prompt: Prompt; detail: PromptDetail }) {
  return (
    <PromptPageProvider prompt={prompt} detail={detail}>
      <main className="paper-grid min-h-screen text-foreground">
        <PromptReadingChrome />
        <div className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
          <PromptHeader />
          <PromptPanel />
          <PromptTutorial />
          <PromptBottom />
        </div>
        <PromptKeepBrowsing />
      </main>
    </PromptPageProvider>
  );
}
