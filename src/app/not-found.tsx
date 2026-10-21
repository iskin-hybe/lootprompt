import { NotFoundPage } from "@/components/sites/lootprompt/chrome/not-found-page";
import { SiteChrome } from "@/components/sites/lootprompt/chrome/site-chrome";

/** Site-wide 404, including links to source routes the clone does not build. */
export default function NotFound() {
  return (
    <>
      <NotFoundPage />
      <SiteChrome />
    </>
  );
}
