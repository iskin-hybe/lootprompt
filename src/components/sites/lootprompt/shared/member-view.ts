// The clone browses lootprompt.com as a signed-in crew member would: every prompt
// page opens directly (no "crew-only" gate, no direct-link strip). Sign-up and the
// rest of the account UI still behave as for a guest.
export const MEMBER_VIEW = true;

/** Local route for a prompt's detail page. */
export function localPromptHref(id: string): string {
  return `/prompt/${id}`;
}
