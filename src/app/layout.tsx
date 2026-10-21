import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import { siteOrigin } from "@/components/sites/lootprompt/site-origin";
import "./globals.css";

// Fonts are self-hosted (scripts/lootprompt/fetch-fonts.py) so builds never depend on
// Google Fonts; the latin subsets are preloaded, as next/font/google did.
const PRELOADED_FONTS = ["inter-tight", "cormorant-garamond", "caveat", "alex-brush"].flatMap((slug) =>
  ["latin", "latin-ext"].map((subset) => `/sites/lootprompt/fonts/${slug}-${subset}.woff2`),
);

const origin = siteOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "Prompts by Deniz Akkabak — AI Prompt Database",
  description:
    "Curated high-quality AI prompts for creatives and developers, organized by video, photo and audio.",
  authors: [{ name: "Deniz Akkabak" }],
  alternates: { canonical: `${origin}/` },
  openGraph: {
    title: "Prompts by Deniz Akkabak — AI Prompt Database",
    description:
      "Curated high-quality AI prompts for creatives and developers, organized by video, photo and audio.",
    type: "website",
    url: `${origin}/`,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#F5F1E8",
};

// Runs before paint so the stored theme and the first-visit hero intro apply without a flash.
const themeScript = `(function(){try{var s=localStorage.getItem("pda:theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
const heroIntroScript = `try{if(!sessionStorage.getItem("hero-intro-played")&&matchMedia("(min-width: 900px)").matches&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.setAttribute("data-hero-intro","1")}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  for (const href of PRELOADED_FONTS) preload(href, { as: "font", type: "font/woff2", crossOrigin: "" });
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: heroIntroScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
