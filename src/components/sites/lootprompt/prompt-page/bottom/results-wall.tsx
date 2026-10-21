"use client";

import { useCallback, useState, type FormEvent } from "react";
import { InkToaster, type ToastKind, type ToastMessage } from "../../footer/ink-toast";

/** Submissions wait for approval; the clone keeps them in this browser instead of the source's table. */
const LOCAL_RESULTS_KEY = "lp:prompt-results";
/** Stand-in for the insert round trip so the submit button shows its pending state. */
const SUBMIT_DELAY_MS = 320;
const MAX_UPLOAD_BYTES = 41943040;

const COPY = {
  sectionLabel: "Made with this",
  eyebrow: "Made with this",
  invite: "If you made something, add it here",
  close: "Close",
  add: "Add your result",
  handlePlaceholder: "@your instagram handle",
  linkPlaceholder: "Link to your result",
  uploadLabel: "…or upload a file",
  notePlaceholder: "Short note (optional)",
  submit: "Submit",
  submitting: "…",
  uploading: "loading…",
  afterApproval: "Published after approval.",
  submitted: "Submitted — it will appear here after approval",
  uploaded: "Uploaded",
  uploadFailed: "Upload failed",
  empty: "No results shared yet — be the first.",
  errorHandle: "Enter a username.",
  errorLink: "Add a link or upload a file.",
  errorFileSize: "File must be under 40MB.",
};

type MediaType = "image" | "video";

interface PendingResult {
  prompt_id: string;
  handle: string;
  url: string;
  media_type: MediaType;
  note: string | null;
  status: "pending";
  created_at: string;
}

/** Validates and files a result the way the source's insert does (community chunk `p`). */
async function submitResult(input: {
  promptId: string;
  handle: string;
  url: string;
  mediaType: MediaType;
  note: string;
}): Promise<void> {
  const handle = input.handle.trim().replace(/^@+/, "");
  const url = input.url.trim();
  if (handle.length < 1 || handle.length > 60) throw new Error(COPY.errorHandle);
  if (url.length < 3 || url.length > 2000) throw new Error(COPY.errorLink);
  const result: PendingResult = {
    prompt_id: input.promptId,
    handle: `@${handle}`,
    url,
    media_type: input.mediaType,
    note: input.note.trim().slice(0, 400) || null,
    status: "pending",
    created_at: new Date().toISOString(),
  };
  await new Promise((resolve) => window.setTimeout(resolve, SUBMIT_DELAY_MS));
  try {
    const raw = window.localStorage.getItem(LOCAL_RESULTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? (parsed as PendingResult[]) : [];
    window.localStorage.setItem(LOCAL_RESULTS_KEY, JSON.stringify([result, ...list]));
  } catch {}
}

/**
 * "Made with this" results wall (source results-wall chunk `ResultsWall`).
 * The snapshot has no approved results, so the wall shows its empty line; new
 * submissions wait for approval and therefore never appear here.
 */
export function ResultsWall({ promptId }: { promptId: string }) {
  const [formOpen, setFormOpen] = useState(false);
  const [handle, setHandle] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const closeToast = useCallback(() => setToast(null), []);
  const showToast = (kind: ToastKind, text: string) => setToast({ id: Date.now(), kind, text });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    submitResult({ promptId, handle, url: link, mediaType, note })
      .then(() => {
        setHandle("");
        setLink("");
        setNote("");
        setFormOpen(false);
        showToast("success", COPY.submitted);
      })
      .catch((error: unknown) => showToast("error", error instanceof Error ? error.message : String(error)))
      .finally(() => setPending(false));
  };

  // The source uploads to its storage bucket and fills the link field with the public URL;
  // here the file stays in this browser and the field gets a local object URL.
  const onFile = async (file: File) => {
    setUploading(true);
    try {
      if (file.size > MAX_UPLOAD_BYTES) throw new Error(COPY.errorFileSize);
      await new Promise((resolve) => window.setTimeout(resolve, SUBMIT_DELAY_MS));
      setLink(URL.createObjectURL(file));
      setMediaType(file.type.startsWith("video") ? "video" : "image");
      showToast("success", COPY.uploaded);
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : COPY.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="mt-14" aria-label={COPY.sectionLabel}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">{COPY.eyebrow}</p>
          <p className="mt-1 font-hand text-lg text-muted-foreground">{COPY.invite}</p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="pill pill-md border border-[var(--paper-line)] font-ui text-xs text-muted-foreground hover:text-foreground"
        >
          {formOpen ? COPY.close : COPY.add}
        </button>
      </div>
      {formOpen ? (
        <form
          className="mt-4 space-y-3 rounded-[15px] border border-[var(--paper-line)] bg-[var(--card-surface)] p-5"
          onSubmit={onSubmit}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={COPY.handlePlaceholder}
              maxLength={60}
              className="search-field !h-10 !rounded-[10px]"
            />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder={COPY.linkPlaceholder}
              maxLength={2000}
              className="search-field !h-10 !rounded-[10px]"
            />
          </div>
          <label className="block font-ui text-[0.72rem] text-muted-foreground">
            {COPY.uploadLabel}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
              className="mt-1 block w-full text-[0.7rem]"
            />
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={COPY.notePlaceholder}
            maxLength={400}
            className="search-field !h-auto !rounded-[10px] !py-2"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || uploading || !link.trim()}
              className="rounded-[10px] bg-foreground px-4 py-2 font-ui text-[0.75rem] uppercase tracking-[0.14em] text-[var(--card-surface)] disabled:opacity-50"
            >
              {pending ? COPY.submitting : COPY.submit}
            </button>
            <span className="font-ui text-[0.7rem] text-muted-foreground">
              {uploading ? COPY.uploading : COPY.afterApproval}
            </span>
          </div>
        </form>
      ) : null}
      <p className="mt-5 font-ui text-[0.75rem] text-muted-foreground">{COPY.empty}</p>
      <InkToaster toast={toast} onClose={closeToast} />
    </section>
  );
}
