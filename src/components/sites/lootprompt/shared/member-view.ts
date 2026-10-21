// The clone browses lootprompt.com as a signed-in crew member would: every prompt
// page opens directly (no "crew-only" gate, no direct-link strip). Sign-up and the
// rest of the account UI still behave as for a guest.
// Links to source routes the clone doesn't build (/koleksiyonum, /about, /most-wanted,
// /jobs, /olay-yeri, /h/:username) keep the source's same-origin paths, never
// lootprompt.com; until those routes exist they land on the clone's 404 page.
export const MEMBER_VIEW = true;

/** Local route for a prompt's detail page. */
export function localPromptHref(id: string): string {
  return `/prompt/${id}`;
}

/** Same-origin route of a thief's profile, as the source links it (`/h/$username`). */
export function thiefHref(username: string): string {
  return `/h/${encodeURIComponent(username)}`;
}
