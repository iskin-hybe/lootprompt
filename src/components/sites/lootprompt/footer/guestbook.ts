// Guestbook ("Crime Scene" wall) prints for a signed-out visitor.
//
// The source inserts into its Supabase `guestbook_prints` table. The clone keeps
// everything in this browser instead: the same localStorage keys the source uses
// for the visitor key, print pattern and "already printed" flag, plus a local list
// of prints standing in for the table (with its one-print-per-visitor rule).

const VISITOR_KEY = "parmak-izi-anahtari";
const PATTERN_KEY = "parmak-izi-deseni";
const PRINTED_KEY = "parmak-izi-birakildi";
const LOCAL_PRINTS_KEY = "lp:guestbook-prints";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
/** Stand-in for the insert round trip so the pad shows its pending state. */
const SUBMIT_DELAY_MS = 320;

export interface LocalPrint {
  prompt_id: string | null;
  visitor_key: string;
  seed: string;
  handle: string;
  note: string;
  status: "approved";
  created_at: string;
}

function randomId(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

function storedId(key: string, length: number): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing && existing.length >= 6) return existing;
    const fresh = randomId(length);
    window.localStorage.setItem(key, fresh);
    return fresh;
  } catch {
    return randomId(length);
  }
}

/** Anonymous per-browser key (one print per visitor). */
export function visitorKey(): string {
  return storedId(VISITOR_KEY, 24);
}

/** Seed for this visitor's fingerprint pattern. */
export function patternSeed(): string {
  return storedId(PATTERN_KEY, 12);
}

function printedKey(promptId: string | null): string {
  return `${PRINTED_KEY}:${promptId ?? "site"}`;
}

export function hasPrinted(promptId: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(printedKey(promptId)) === "1";
  } catch {
    return false;
  }
}

function markPrinted(promptId: string | null): void {
  try {
    window.localStorage.setItem(printedKey(promptId), "1");
  } catch {}
}

function readLocalPrints(): LocalPrint[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_PRINTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LocalPrint[]) : [];
  } catch {
    return [];
  }
}

function writeLocalPrints(prints: LocalPrint[]): void {
  try {
    window.localStorage.setItem(LOCAL_PRINTS_KEY, JSON.stringify(prints));
  } catch {}
}

/** Leaves the visitor's print. Resolves `already: true` when one is on file. */
export async function leavePrint({
  promptId,
  handle,
  note,
}: {
  promptId: string | null;
  handle: string;
  note: string;
}): Promise<{ already: boolean }> {
  const cleanHandle = handle.trim().replace(/^@+/, "").slice(0, 39);
  const cleanNote = note.trim().replace(/\s+/g, " ").slice(0, 120);
  const print: LocalPrint = {
    prompt_id: promptId,
    visitor_key: visitorKey(),
    seed: patternSeed(),
    handle: cleanHandle ? `@${cleanHandle}` : "",
    note: cleanNote,
    status: "approved",
    created_at: new Date().toISOString(),
  };

  await new Promise((resolve) => window.setTimeout(resolve, SUBMIT_DELAY_MS));

  const prints = readLocalPrints();
  const already = prints.some(
    (p) => p.visitor_key === print.visitor_key && p.prompt_id === print.prompt_id,
  );
  if (!already) writeLocalPrints([print, ...prints]);
  markPrinted(promptId);
  return { already };
}
