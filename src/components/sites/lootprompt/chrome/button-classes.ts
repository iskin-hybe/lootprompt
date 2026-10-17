// Class strings the source's shadcn Button (`ad`) renders after tailwind-merge,
// copied from the live DOM so the chrome buttons match 1:1.
const FOCUS_AND_DISABLED =
  "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

const QUIET =
  "border border-border bg-transparent text-foreground shadow-none hover:border-accent hover:text-accent";

const EDITORIAL =
  "border border-primary bg-primary text-primary-foreground shadow-none hover:border-accent hover:bg-accent hover:text-accent-foreground";

/** variant="quiet" size="default" */
export const quietButton = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-ui text-sm font-medium ${FOCUS_AND_DISABLED} ${QUIET} h-9 px-4 py-2`;

/** variant="quiet" size="icon" */
export const quietIconButton = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-ui text-sm font-medium ${FOCUS_AND_DISABLED} ${QUIET} h-9 w-9`;

/** variant="quiet" size="sm" */
export const quietSmallButton = `inline-flex items-center justify-center gap-2 whitespace-nowrap font-ui font-medium ${FOCUS_AND_DISABLED} ${QUIET} h-8 rounded-sm px-3 text-xs`;

/** variant="editorial" size="sm" */
export const editorialSmallButton = `inline-flex items-center justify-center gap-2 whitespace-nowrap font-ui font-medium ${FOCUS_AND_DISABLED} ${EDITORIAL} h-8 rounded-sm px-3 text-xs`;
