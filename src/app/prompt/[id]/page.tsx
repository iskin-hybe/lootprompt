import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/sites/lootprompt/chrome/site-chrome";
import { prompts, type Prompt } from "@/components/sites/lootprompt/data";
import {
  findPrompt,
  getPromptDetail,
  shareCardPath,
  type PromptDetail,
} from "@/components/sites/lootprompt/prompt-details";
import { PromptPage } from "@/components/sites/lootprompt/prompt-page/prompt-page";
import { siteOrigin } from "@/components/sites/lootprompt/site-origin";

// Every prompt in the snapshot is prerendered; any other id reaches the page, which
// answers with this route's own "Not found" screen.
export const dynamicParams = true;

export function generateStaticParams() {
  return prompts.map((p) => ({ id: p.id }));
}

/** Tutorial HTML as one line of plain text. */
function plainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** The tutorial's opening text (or the prompt), cut to 157 characters. */
function metaDescription(tutorialHtml: string | null, promptText: string): string {
  const text = plainText(tutorialHtml ?? "") || promptText;
  return text.length > 157 ? `${text.slice(0, 157).trimEnd()}…` : text;
}

/** The long "Prompt & Tutorial" title when it fits in 60 characters, else the short one. */
function documentTitle(title: string, model: string): string {
  const long = `${title} — ${model} Prompt & Tutorial | LootPrompt`;
  return long.length <= 60 ? long : `${title} — LootPrompt`.slice(0, 60).trimEnd();
}

interface PromptHead {
  origin: string;
  url: string;
  image: string;
  description: string;
}

function promptHead(prompt: Prompt, detail: PromptDetail): PromptHead {
  const origin = siteOrigin();
  return {
    origin,
    url: `${origin}/prompt/${encodeURIComponent(prompt.id)}`,
    image: `${origin}${shareCardPath(prompt.id)}`,
    description: metaDescription(detail.tutorialHtml, prompt.prompt),
  };
}

/** schema.org graph: the prompt blocks as HowTo steps, the video (if any), and the breadcrumb. */
function structuredData(prompt: Prompt, detail: PromptDetail, head: PromptHead) {
  const { media } = prompt;
  const absolute = (path: string) => (path.startsWith("/") ? `${head.origin}${path}` : path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        name: prompt.title,
        description: head.description,
        step: detail.promptBlocks.map((block, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: block.label,
          text: block.text,
        })),
      },
      ...(media.type === "video"
        ? [
            {
              "@type": "VideoObject",
              name: prompt.title,
              description: head.description,
              thumbnailUrl: [media.poster ? absolute(media.poster) : head.image],
              uploadDate: prompt.createdAt,
              contentUrl: absolute(media.motion ?? media.src),
            },
          ]
        : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "LootPrompt", item: head.origin },
          { "@type": "ListItem", position: 2, name: prompt.title, item: head.url },
        ],
      },
    ],
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const prompt = findPrompt(id);
  const detail = await getPromptDetail(id);
  if (!prompt || !detail) return {};
  const head = promptHead(prompt, detail);
  return {
    metadataBase: new URL(head.origin),
    title: documentTitle(prompt.title, prompt.model),
    description: head.description,
    alternates: { canonical: head.url },
    openGraph: {
      title: prompt.title,
      description: head.description,
      type: "article",
      siteName: "LootPrompt",
      images: [{ url: head.image, width: 1200, height: 630, type: "image/jpeg" }],
      url: head.url,
    },
    twitter: {
      card: "summary_large_image",
      title: prompt.title,
      description: head.description,
      images: [head.image],
    },
  };
}

export default async function PromptRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prompt = findPrompt(id);
  const detail = await getPromptDetail(id);
  if (!prompt || !detail) notFound();
  const jsonLd = structuredData(prompt, detail, promptHead(prompt, detail));
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <PromptPage prompt={prompt} detail={detail} />
      <SiteChrome />
    </>
  );
}
