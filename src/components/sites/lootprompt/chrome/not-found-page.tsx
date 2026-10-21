import Link from "next/link";

/**
 * The source's "Page not found" screen (root `notFoundComponent`, `ev`). Pair it with
 * `<SiteChrome />` the way the prompt route does, since the source keeps its fixed chrome
 * around the 404. Links to source routes the clone does not build land here.
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 font-ui text-sm font-medium text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
