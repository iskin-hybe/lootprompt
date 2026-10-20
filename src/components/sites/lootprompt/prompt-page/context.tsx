"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Prompt } from "../data";
import { stampAngle } from "../gallery/lib";
import { stealPrompt, type StealStamp } from "../gallery/use-steal";
import type { PromptDetail } from "../prompt-details";

interface PromptPageState {
  prompt: Prompt;
  detail: PromptDetail;
  /** The main prompt as it will be copied (remix tokens applied by the panel). */
  composedPrompt: string;
  setComposedPrompt: (text: string, remixed: boolean) => void;
  /** True after a steal that copied a remixed version (source `panel.remixedCopyNote`). */
  copiedRemix: boolean;
  /** Steals the composed prompt: clipboard, toast, stamp, local steal log (source `Q`). */
  steal: () => Promise<void>;
  copied: boolean;
  stamp: StealStamp | null;
  stealCount: number;
}

const PromptPageContext = createContext<PromptPageState | null>(null);

export function usePromptPage(): PromptPageState {
  const value = useContext(PromptPageContext);
  if (!value) throw new Error("usePromptPage must be used inside PromptPageProvider");
  return value;
}

export function PromptPageProvider({
  prompt,
  detail,
  children,
}: {
  prompt: Prompt;
  detail: PromptDetail;
  children: ReactNode;
}) {
  const [composed, setComposed] = useState({ text: prompt.prompt, remixed: false });
  const [copiedRemix, setCopiedRemix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stamp, setStamp] = useState<StealStamp | null>(null);
  const [stealCount, setStealCount] = useState(prompt.copyCount);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const setComposedPrompt = useCallback((text: string, remixed: boolean) => {
    setComposed({ text, remixed });
  }, []);

  const steal = useCallback(async () => {
    const counted = await stealPrompt({ id: prompt.id, title: prompt.title, prompt: composed.text });
    setCopiedRemix(composed.remixed);
    setCopied(true);
    timers.current.push(window.setTimeout(() => setCopied(false), 1600));
    const key = Date.now();
    setStamp({ angle: stampAngle(), key });
    timers.current.push(window.setTimeout(() => setStamp((s) => (s && s.key === key ? null : s)), 1300));
    if (counted) setStealCount((n) => n + 1);
  }, [composed, prompt.id, prompt.title]);

  // "C" steals from anywhere on the page, as on the source.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      if (event.key.toLowerCase() === "c") void steal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steal]);

  const value = useMemo<PromptPageState>(
    () => ({
      prompt,
      detail,
      composedPrompt: composed.text,
      setComposedPrompt,
      copiedRemix,
      steal,
      copied,
      stamp,
      stealCount,
    }),
    [prompt, detail, composed.text, setComposedPrompt, copiedRemix, steal, copied, stamp, stealCount],
  );

  return <PromptPageContext.Provider value={value}>{children}</PromptPageContext.Provider>;
}
