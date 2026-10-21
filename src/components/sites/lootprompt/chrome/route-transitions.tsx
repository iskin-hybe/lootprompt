"use client";

import type {} from "react/canary";
import { useEffect, ViewTransition } from "react";

/**
 * The source's router runs every navigation as a view transition (TanStack
 * `defaultViewTransition: true`): the old page fades out, the new one rises in
 * (`::view-transition-*(root)` in lootprompt.css) and `.shared-media` morphs
 * between a gallery card and the prompt page's media.
 *
 * React starts a document view transition only when a <ViewTransition> mounts or
 * unmounts inside a transition. Next.js navigations are transitions and the chrome
 * remounts with every page, so this marker makes each navigation one. React also
 * drops the root snapshot unless <html> names it explicitly, so it gets "root".
 */
export function RouteTransitions() {
  useEffect(() => {
    const html = document.documentElement;
    if (!html.style.getPropertyValue("view-transition-name")) {
      html.style.setProperty("view-transition-name", "root");
    }
  }, []);

  return <ViewTransition default="none" />;
}
