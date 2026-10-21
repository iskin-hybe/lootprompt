import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SiteChrome } from "@/components/sites/lootprompt/chrome/site-chrome";

/** Unknown prompt id: the prompt route's own "Not found" screen (source `notFoundComponent`). */
export default function PromptNotFound() {
  return (
    <>
      <main className="paper-grid grid min-h-screen place-items-center text-foreground">
        <div className="text-center">
          <h1 className="hand-headline text-5xl">Not found</h1>
          <p className="mt-4 font-ui text-sm text-muted-foreground">This prompt does not exist or has been removed.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 font-ui text-sm text-foreground underline underline-offset-4"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to gallery
          </Link>
        </div>
      </main>
      <SiteChrome />
    </>
  );
}
