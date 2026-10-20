"use client";

// Minimal stand-in for the source's sonner <Toaster position="bottom-center">:
// plain toasts (save heart) and unstyled "ink" toasts (steals).
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./toast.css";

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
          timers.add(window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 400));
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
    <ol aria-live="polite" className="gal-toaster">
      {items.map((t) => (
        <li key={t.id} className="gal-toast-item" data-kind={t.kind} data-leaving={t.leaving ? "true" : undefined}>
          {t.kind === "ink" ? (
            <div className="ink-toast font-ui text-[0.72rem] tracking-[0.06em]">{t.text}</div>
          ) : (
            <div className="gal-toast">{t.text}</div>
          )}
        </li>
      ))}
    </ol>,
    document.body,
  );
}
