"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

/** "Install app" link, shown only when the browser offers a PWA install prompt. */
export function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;

  return (
    <button
      type="button"
      className="font-ui text-[0.7rem] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      onClick={() => {
        setInstallEvent(null);
        void installEvent.prompt();
      }}
    >
      Install app
    </button>
  );
}
