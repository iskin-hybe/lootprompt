"use client";

import { Bell, Check, Trash2 } from "lucide-react";
import { useState } from "react";
import { quietIconButton, quietSmallButton } from "./button-classes";
import { ThiefMask } from "./floor-icons";
import { readStorage, useHydrated, writeStorage } from "./use-hydrated";

// Guests keep the floor's greetings for the tab in sessionStorage.
const NOTES_KEY = "pda:floor-notifications";

const GREETINGS: Record<string, string> = {
  g1: "The floor sees you.",
  g2: "Nice mask. Stranger.",
  g3: "Meet me by the vault.",
  g4: "Clean getaway.",
  g5: "Your secret is safe here.",
  g6: "The night shift salutes you.",
  g7: "That was a smooth move.",
  g8: "Keep your hands quick.",
  g9: "A little wave from the shadows.",
  g10: "You look like trouble.",
  g11: "Welcome to the floor.",
  g12: "Eyes up, thief.",
};

interface FloorNote {
  id: string;
  alias: string;
  mask: string;
  greetingKey: string;
  createdAt: number;
  read: boolean;
}

function readNotes(): FloorNote[] {
  try {
    const parsed: unknown = JSON.parse(readStorage("session", NOTES_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as FloorNote[]) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: FloorNote[]) {
  writeStorage("session", NOTES_KEY, JSON.stringify(notes));
}

/** Bottom-right bell with the floor's notes (source `df`, guest mode). */
export function NotificationBell() {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [edited, setEdited] = useState<FloorNote[] | null>(null);
  const notes = [...(edited ?? (hydrated ? readNotes() : []))].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const unread = notes.filter((note) => !note.read).length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next || unread === 0) return;
    const read = notes.map((note) => ({ ...note, read: true }));
    setEdited(read);
    saveNotes(read);
  };

  const clearAll = () => {
    setEdited([]);
    saveNotes([]);
  };

  return (
    <div className="floor-notification-center">
      <button
        type="button"
        className={`${quietIconButton} floor-bell`}
        aria-label="Notifications"
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell aria-hidden="true" />
        {unread > 0 ? <span className="floor-unread">{unread > 9 ? "9+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="floor-notification-panel" role="dialog" aria-label="Notifications">
          <div className="floor-panel-heading">
            <strong>Notifications</strong>
            <button
              type="button"
              className={quietSmallButton}
              onClick={clearAll}
              disabled={notes.length === 0}
            >
              <Trash2 aria-hidden="true" /> Clear all
            </button>
          </div>
          <div className="floor-notification-list">
            {notes.length === 0 ? (
              <p className="floor-empty">No notes from the floor yet.</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className={`floor-notification ${note.read ? "is-read" : ""}`}>
                  <ThiefMask variant={note.mask} size={30} />
                  <div>
                    <strong>{note.alias}</strong>
                    <span>{GREETINGS[note.greetingKey] ?? GREETINGS.g1}</span>
                  </div>
                  {note.read ? <Check aria-hidden="true" /> : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
