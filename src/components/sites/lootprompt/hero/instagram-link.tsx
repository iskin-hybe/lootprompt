import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "../data";

/** Hand-drawn Instagram glyph. */
export function InstagramGlyph({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path
        d="M8.5 4.6C13 3.9 19.5 3.8 23.8 4.7C26.8 5.3 28.2 7.4 28.4 10.4C28.7 14.6 28.6 19 28 22.6C27.5 25.9 25.6 27.3 22.4 27.7C18 28.3 12.6 28.2 8.9 27.5C5.9 26.9 4.4 25 4.1 21.8C3.7 17.7 3.8 12.3 4.4 9C4.9 6.3 6.2 5 8.5 4.6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M16.2 10.4C19.2 10.2 21.7 12.7 21.6 15.9C21.5 19 19.1 21.5 16 21.4C13 21.3 10.6 18.8 10.7 15.7C10.8 12.8 13.2 10.5 16.2 10.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M23.1 8.7c.5-.1 1 .3 1 .9s-.5 1-1 .9-.9-.4-.9-.9.4-.8.9-.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Small Instagram link used next to "My Collection". */
export function InstagramLink({ className = "" }: { className?: string }) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Instagram — ${INSTAGRAM_HANDLE}`}
      title={`Instagram — ${INSTAGRAM_HANDLE}`}
      className={`text-muted-foreground transition-colors hover:text-foreground ${className}`}
    >
      <InstagramGlyph className="size-[18px]" />
    </a>
  );
}
