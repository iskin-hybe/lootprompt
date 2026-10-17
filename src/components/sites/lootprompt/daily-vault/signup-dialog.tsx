"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SITE_ORIGIN } from "../data";

type AuthTab = "signup" | "login";

let scrollLocks = 0;
let savedOverflow = "";

/** Portals into <body> (client-only: dialogs open on interaction) and locks page scroll. */
function BodyPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    if (scrollLocks === 0) {
      savedOverflow = root.style.overflow;
      root.style.overflow = "hidden";
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) root.style.overflow = savedOverflow;
    };
  }, []);
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

function InkAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[10px] border border-foreground/25 bg-foreground/[0.04] px-3 py-2 font-ui text-[0.78rem] leading-snug text-foreground"
    >
      <TriangleAlert className="mt-[1px] size-3.5 shrink-0 opacity-70" aria-hidden={true} />
      <span className="break-words">{message}</span>
    </div>
  );
}

/**
 * lootprompt's "The crew" sign-up / log-in modal. Accounts live on
 * lootprompt.com, so a valid submission hands the visitor over to it.
 */
export function SignupDialog({
  onClose,
  initialTab = "signup",
}: {
  onClose: () => void;
  initialTab?: AuthTab;
}) {
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handOff = () => {
    window.open(`${SITE_ORIGIN}/`, "_self");
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tab === "signup" && !/^[a-z0-9_.]{3,24}$/.test(username.trim().toLowerCase())) {
      setError("Username: 3-24 characters, letters, numbers, _ or . only.");
      return;
    }
    setError(null);
    handOff();
  };

  return (
    <BodyPortal>
      <div className="crew-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <section className="crew-modal" onClick={(e) => e.stopPropagation()}>
          <p className="font-ui text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground">
            The crew
          </p>
          <div className="mt-4 flex gap-5">
            {(["signup", "login"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`font-ui text-sm transition-colors ${tab === key ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {key === "signup" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>
          <form className="mt-6 space-y-3" onSubmit={onSubmit}>
            {tab === "signup" ? (
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="search-field !rounded-[10px] !px-4"
            />
            <input
              type="password"
              required
              minLength={8}
              autoComplete={tab === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="search-field !rounded-[10px] !px-4"
            />
            {tab === "signup" ? (
              <label className="flex items-start gap-3 pt-1">
                <input
                  type="checkbox"
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
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
              onClick={() => {
                if (!email) setError("Enter your email first.");
                else handOff();
              }}
              className="mt-3 font-ui text-[0.72rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot password?
            </button>
          ) : null}
          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--paper-line)]" />
            <span className="font-ui text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-[var(--paper-line)]" />
          </div>
          <button type="button" className="crew-google" onClick={handOff}>
            Continue with Google
          </button>
          <p className="mt-5 font-ui text-[0.7rem] leading-relaxed text-muted-foreground">
            An account is optional. Everything here — including stealing prompts — works without
            one.
          </p>
        </section>
      </div>
    </BodyPortal>
  );
}
