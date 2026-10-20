"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { SITE_ORIGIN } from "../data";
import { BodyPortal } from "./portal";

export type AuthTab = "signup" | "login";

const USERNAME_PATTERN = /^[a-z0-9_.]{3,24}$/;
const USERNAME_ERROR = "Username: 3-24 characters, letters, numbers, _ or . only.";

/**
 * Accounts live on lootprompt.com; this clone does not run the auth flow, so
 * every way of joining hands the visitor over to the real site.
 */
function continueOnLootprompt() {
  window.open(`${SITE_ORIGIN}/`, "_self");
}

/** Inline error note (source `jh`). */
function InkAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[10px] border border-foreground/25 bg-foreground/[0.04] px-3 py-2 font-ui text-[0.78rem] leading-snug text-foreground"
    >
      <TriangleAlert className="mt-[1px] size-3.5 shrink-0 opacity-70" aria-hidden />
      <span className="break-words">{message}</span>
    </div>
  );
}

/** Sign up / log in form (source `zh`). */
export function CrewAuthForm({
  initialTab = "signup",
  googleFirst = false,
  hideLabel = false,
}: {
  initialTab?: AuthTab;
  googleFirst?: boolean;
  hideLabel?: boolean;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (tab === "signup" && !USERNAME_PATTERN.test(username.trim().toLowerCase())) {
      setError(USERNAME_ERROR);
      return;
    }
    setError(null);
    continueOnLootprompt();
  };

  const onForgotPassword = () => {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    continueOnLootprompt();
  };

  const google = (
    <button
      type="button"
      className={googleFirst ? "crew-google crew-google-first" : "crew-google"}
      onClick={continueOnLootprompt}
    >
      Continue with Google
    </button>
  );

  return (
    <>
      {googleFirst ? google : null}
      {hideLabel ? null : (
        <p className="font-ui text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground">
          The crew
        </p>
      )}
      <div className="mt-4 flex gap-5">
        {(["signup", "login"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTab(option)}
            className={`font-ui text-sm transition-colors ${tab === option ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {option === "signup" ? "Sign up" : "Log in"}
          </button>
        ))}
      </div>
      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        {tab === "signup" ? (
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            autoComplete="username"
            required
            className="search-field !rounded-[10px] !px-4"
          />
        ) : null}
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="search-field !rounded-[10px] !px-4"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete={tab === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="search-field !rounded-[10px] !px-4"
        />
        {tab === "signup" ? (
          <label className="flex items-start gap-3 pt-1">
            <input
              type="checkbox"
              checked={emailOptIn}
              onChange={(event) => setEmailOptIn(event.target.checked)}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span className="font-ui text-[0.78rem] text-muted-foreground">
              Send new prompts to my inbox
            </span>
          </label>
        ) : null}
        <InkAlert message={error} />
        <button type="submit" className="crew-submit">
          {tab === "signup" ? "Join the crew" : "Log in"}
        </button>
      </form>
      {tab === "login" ? (
        <button
          type="button"
          onClick={onForgotPassword}
          className="mt-3 font-ui text-[0.72rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Forgot password?
        </button>
      ) : null}
      {googleFirst ? null : (
        <>
          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--paper-line)]" />
            <span className="font-ui text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-[var(--paper-line)]" />
          </div>
          {google}
        </>
      )}
      <p className="mt-5 font-ui text-[0.7rem] leading-relaxed text-muted-foreground">
        An account is optional. Everything here — including stealing prompts — works without one.
      </p>
    </>
  );
}

/** "The crew" sign-up modal opened by the header's Join button (source `Rh`). */
export function AuthModal({
  onClose,
  initialTab = "signup",
}: {
  onClose: () => void;
  initialTab?: AuthTab;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <BodyPortal>
      <div className="crew-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <section className="crew-modal" onClick={(event) => event.stopPropagation()}>
          <CrewAuthForm initialTab={initialTab} />
        </section>
      </div>
    </BodyPortal>
  );
}
