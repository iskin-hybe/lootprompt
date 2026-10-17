"use client";

// Minimal stand-in for the source's sonner <Toaster position="bottom-center">:
// plain toasts (save heart) and unstyled "ink" toasts (steals).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ToastKind = "plain" | "ink";

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
  leaving: boolean;
}

type Listener = (toast: { kind: ToastKind; text: string; duration: number }) => void;

const listeners = new Set<Listener>();

export function showToast(text: string, kind: ToastKind = "plain", duration = 4000): void {
  listeners.forEach((fn) => fn({ kind, text, duration }));
}

let nextId = 1;

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Portals need document.body, which only exists after mount.
    setMounted(true);
    const timers = new Set<number>();
    const listener: Listener = ({ kind, text, duration }) => {
      const id = nextId++;
      setItems((list) => [...list.slice(-2), { id, kind, text, leaving: false }]);
      timers.add(
        window.setTimeout(() => {
          setItems((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
          timers.add(window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 220));
        }, duration),
      );
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[999999999] flex flex-col items-center gap-2 sm:bottom-8"
    >
      {items.map((t) => (
        <li
          key={t.id}
          className={`pointer-events-auto transition-all duration-200 ease-out ${
            t.leaving ? "translate-y-2 opacity-0" : "animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
          }`}
        >
          {t.kind === "ink" ? (
            <div className="ink-toast font-ui text-[0.72rem] tracking-[0.06em]">{t.text}</div>
          ) : (
            <div className="flex w-full items-center gap-1.5 rounded-lg border border-border bg-background p-4 font-ui text-[13px] text-foreground shadow-lg sm:w-[356px]">
              {t.text}
            </div>
          )}
        </li>
      ))}
    </ol>,
    document.body,
  );
}
