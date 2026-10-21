"use client";

// The source's toaster: sonner 2 mounted once as
// <Toaster position="bottom-center" className="toaster group" toastOptions={{ classNames: { toast } }} />
// in its light theme. "plain" toasts are sonner's styled `toast(text)`; "ink" toasts are the
// unstyled `toast.custom(...)` steal notes. The newest toast sits in front, older ones collapse
// behind it and fan out while the stack is hovered; timers pause meanwhile.
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "../chrome/use-hydrated";
import "./toast.css";

type ToastKind = "plain" | "ink";

interface ToastData {
  id: number;
  kind: ToastKind;
  text: string;
  duration: number;
}

interface ToastHeight {
  id: number;
  height: number;
}

const VISIBLE_TOASTS = 3;
const GAP = 14;
const TOAST_WIDTH = 356;
const VIEWPORT_OFFSET = "24px";
const MOBILE_VIEWPORT_OFFSET = "16px";
const DEFAULT_DURATION = 4000;
/** How long a dismissed toast keeps animating out before it leaves the DOM. */
const TIME_BEFORE_UNMOUNT = 200;
/** shadcn's sonner wrapper adds these to every toast (`toastOptions.classNames.toast`). */
const TOAST_CLASS =
  "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg";

type Listener = (toast: ToastData) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function showToast(text: string, kind: ToastKind = "plain", duration = DEFAULT_DURATION): void {
  const toast: ToastData = { id: nextId++, kind, text, duration };
  listeners.forEach((fn) => fn(toast));
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** Timers stop while the tab is in the background, as sonner's do. */
function useDocumentHidden(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => document.hidden,
    () => false,
  );
}

interface ToastProps {
  toast: ToastData;
  index: number;
  count: number;
  heights: ToastHeight[];
  setHeights: Dispatch<SetStateAction<ToastHeight[]>>;
  expanded: boolean;
  interacting: boolean;
  removeToast: (id: number) => void;
}

function Toast({ toast, index, count, heights, setHeights, expanded, interacting, removeToast }: ToastProps) {
  const ref = useRef<HTMLLIElement>(null);
  const [mounted, setMounted] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [initialHeight, setInitialHeight] = useState(0);
  const [offsetBeforeRemove, setOffsetBeforeRemove] = useState(0);
  const remaining = useRef(toast.duration);
  const timerStartedAt = useRef(0);
  const pausedAt = useRef(0);
  const hidden = useDocumentHidden();

  // Distance from the bottom of the stack when expanded: the toasts in front plus their gaps.
  const heightIndex = heights.findIndex((h) => h.id === toast.id);
  const heightsBefore = heights.reduce((sum, h, i) => (i >= heightIndex ? sum : sum + h.height), 0);
  const offset = heightIndex * GAP + heightsBefore;

  useEffect(() => {
    const li = ref.current;
    if (!li) return;
    // Measuring also commits the off-screen start styles, so the slide-in below transitions.
    const height = li.getBoundingClientRect().height;
    setInitialHeight(height);
    setMounted(true);
    setHeights((list) => [{ id: toast.id, height }, ...list]);
    return () => setHeights((list) => list.filter((h) => h.id !== toast.id));
  }, [setHeights, toast.id]);

  const startRemoval = useEffectEvent(() => {
    setRemoved(true);
    setOffsetBeforeRemove(offset);
    setHeights((list) => list.filter((h) => h.id !== toast.id));
    window.setTimeout(() => removeToast(toast.id), TIME_BEFORE_UNMOUNT);
  });

  // Auto-dismiss; hovering or pressing the stack, or hiding the tab, pauses the countdown.
  const paused = expanded || interacting || hidden;
  useEffect(() => {
    if (paused) {
      if (pausedAt.current < timerStartedAt.current) {
        remaining.current -= Date.now() - timerStartedAt.current;
      }
      pausedAt.current = Date.now();
      return;
    }
    timerStartedAt.current = Date.now();
    const timer = window.setTimeout(startRemoval, remaining.current);
    return () => window.clearTimeout(timer);
  }, [paused]);

  const styled = toast.kind === "plain";
  const style = {
    "--index": index,
    "--toasts-before": index,
    "--z-index": count - index,
    "--offset": `${removed ? offsetBeforeRemove : offset}px`,
    "--initial-height": `${initialHeight}px`,
  } as CSSProperties;

  return (
    <li
      ref={ref}
      tabIndex={0}
      className={TOAST_CLASS}
      data-sonner-toast=""
      data-styled={styled}
      data-mounted={mounted}
      data-removed={removed}
      data-visible={index + 1 <= VISIBLE_TOASTS}
      data-y-position="bottom"
      data-x-position="center"
      data-index={index}
      data-front={index === 0}
      data-swiping={false}
      data-swipe-out={false}
      data-dismissible={true}
      data-expanded={expanded}
      style={style}
    >
      <div data-content="">
        <div data-title="">
          {styled ? (
            toast.text
          ) : (
            <div className="ink-toast font-ui text-[0.72rem] tracking-[0.06em]">{toast.text}</div>
          )}
        </div>
      </div>
    </li>
  );
}

export function ToastHost() {
  const hydrated = useHydrated();
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [heights, setHeights] = useState<ToastHeight[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [seenToasts, setSeenToasts] = useState(toasts);
  const listRef = useRef<HTMLOListElement>(null);
  const focusBefore = useRef<HTMLElement | null>(null);
  const focusInside = useRef(false);

  // A stack of one never stays fanned out.
  if (seenToasts !== toasts) {
    setSeenToasts(toasts);
    if (toasts.length <= 1) setExpanded(false);
  }

  useEffect(() => {
    const timers = new Set<number>();
    const listener: Listener = (toast) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setToasts((list) => [toast, ...list]);
      });
      timers.add(timer);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Alt+T fans the stack out and focuses it; Escape inside folds it back.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.code === "KeyT") {
        setExpanded(true);
        listRef.current?.focus();
      }
      const list = listRef.current;
      if (event.code === "Escape" && list && (document.activeElement === list || list.contains(document.activeElement))) {
        setExpanded(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // When the last toast goes while focus is inside, hand focus back.
  const hasToasts = toasts.length > 0;
  useEffect(() => {
    if (!hasToasts) return;
    return () => {
      if (!focusBefore.current) return;
      focusBefore.current.focus({ preventScroll: true });
      focusBefore.current = null;
      focusInside.current = false;
    };
  }, [hasToasts]);

  const removeToast = (id: number) => setToasts((list) => list.filter((t) => t.id !== id));

  if (!hydrated) return null;

  const listStyle = {
    "--front-toast-height": `${heights[0]?.height || 0}px`,
    "--width": `${TOAST_WIDTH}px`,
    "--gap": `${GAP}px`,
    "--offset-top": VIEWPORT_OFFSET,
    "--offset-right": VIEWPORT_OFFSET,
    "--offset-bottom": VIEWPORT_OFFSET,
    "--offset-left": VIEWPORT_OFFSET,
    "--mobile-offset-top": MOBILE_VIEWPORT_OFFSET,
    "--mobile-offset-right": MOBILE_VIEWPORT_OFFSET,
    "--mobile-offset-bottom": MOBILE_VIEWPORT_OFFSET,
    "--mobile-offset-left": MOBILE_VIEWPORT_OFFSET,
  } as CSSProperties;

  return createPortal(
    <section
      aria-label="Notifications alt+T"
      tabIndex={-1}
      aria-live="polite"
      aria-relevant="additions text"
      aria-atomic="false"
    >
      {hasToasts ? (
        <ol
          ref={listRef}
          dir="ltr"
          tabIndex={-1}
          className="toaster group"
          data-sonner-toaster=""
          data-sonner-theme="light"
          data-y-position="bottom"
          data-x-position="center"
          style={listStyle}
          onBlur={(event) => {
            if (!focusInside.current || event.currentTarget.contains(event.relatedTarget)) return;
            focusInside.current = false;
            focusBefore.current?.focus({ preventScroll: true });
            focusBefore.current = null;
          }}
          onFocus={(event) => {
            if (focusInside.current) return;
            focusInside.current = true;
            focusBefore.current = event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
          }}
          onMouseEnter={() => setExpanded(true)}
          onMouseMove={() => setExpanded(true)}
          onMouseLeave={() => {
            if (!interacting) setExpanded(false);
          }}
          onDragEnd={() => setExpanded(false)}
          onPointerDown={() => setInteracting(true)}
          onPointerUp={() => setInteracting(false)}
        >
          {toasts.map((toast, index) => (
            <Toast
              key={toast.id}
              toast={toast}
              index={index}
              count={toasts.length}
              heights={heights}
              setHeights={setHeights}
              expanded={expanded}
              interacting={interacting}
              removeToast={removeToast}
            />
          ))}
        </ol>
      ) : null}
    </section>,
    document.body,
  );
}
