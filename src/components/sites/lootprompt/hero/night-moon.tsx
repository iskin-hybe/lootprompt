/** Hand-drawn crescent shown after the signature during the night shift. */
export function NightMoon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15.6 3.4c-4.6.6-7.9 4.2-7.6 8.6.3 4.2 3.8 7.5 8.2 7.6-2 1.4-4.6 1.9-7 1.1C5.6 19.5 3.3 16 3.6 12.2 4 7.6 8.1 3.7 13.2 3.2c.8-.1 1.6-.1 2.4.2Z" />
      <path d="M18.4 5.1c.5.5.9 1.1 1.2 1.8" opacity="0.7" />
    </svg>
  );
}
