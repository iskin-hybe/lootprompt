"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { prompts } from "../data";
import { AuthModal } from "../chrome/auth-modal";
import { localPromptHref } from "../shared/member-view";

/** The newest prompt in the vault (the source lists prompts newest first). */
const newest =
  prompts.reduce<(typeof prompts)[number] | null>(
    (best, p) => (!best || p.createdAt > best.createdAt ? p : best),
    null,
  ) ?? null;

/** Guests get "Sign up & subscribe", which opens the crew sign-up modal. */
function SubscribeButton() {
  const [signupOpen, setSignupOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <button type="button" className="btn-sticker" onClick={() => setSignupOpen(true)}>
        Sign up &amp; subscribe
      </button>
      {signupOpen ? <AuthModal onClose={() => setSignupOpen(false)} /> : null}
    </div>
  );
}

/** "This week's prompt" strip with a NEW stamp and the newsletter CTA. */
export function DropBanner() {
  return (
    <section
      aria-label="This week's prompt"
      className="drop-banner mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-5 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-8"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="new-stamp" aria-hidden="true">
          New
        </span>
        <div className="min-w-0">
          <p className="font-hand text-lg leading-none text-muted-foreground">This week&apos;s prompt</p>
          {newest ? (
            <Link
              href={localPromptHref(newest.id)}
              prefetch={false}
              className="mt-1 inline-flex items-center gap-2 font-ui text-base text-foreground transition-colors hover:text-[var(--accent)] sm:text-lg"
            >
              <span className="truncate">{newest.title}</span>
              <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : (
            <p className="mt-1 font-ui text-sm text-muted-foreground">Coming soon.</p>
          )}
        </div>
      </div>
      <SubscribeButton />
    </section>
  );
}
