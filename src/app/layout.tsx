import type { Metadata, Viewport } from "next";
import { Alex_Brush, Caveat, Cormorant_Garamond, Inter_Tight } from "next/font/google";
import { siteOrigin } from "@/components/sites/lootprompt/site-origin";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const alexBrush = Alex_Brush({
  variable: "--font-alex-brush",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

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
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${interTight.variable} ${cormorant.variable} ${caveat.variable} ${alexBrush.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: heroIntroScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
