import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/sites/lootprompt/chrome/site-chrome";
import { prompts } from "@/components/sites/lootprompt/data";
import { findPrompt, getPromptDetail } from "@/components/sites/lootprompt/prompt-details";
import { PromptPage } from "@/components/sites/lootprompt/prompt-page/prompt-page";

// Every prompt in the snapshot is prerendered; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return prompts.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const prompt = findPrompt(id);
  const detail = await getPromptDetail(id);
  if (!prompt || !detail) return {};
  const description = `${prompt.model} prompt by Deniz Akkabak — ${prompt.title}.`;
  return {
    title: `${prompt.title} — LootPrompt`,
    description,
    openGraph: {
      title: `${prompt.title} — LootPrompt`,
      description,
      type: "article",
      images: detail.ogImage ? [detail.ogImage] : prompt.media.poster ? [prompt.media.poster] : undefined,
    },
  };
}

export default async function PromptRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prompt = findPrompt(id);
  const detail = await getPromptDetail(id);
  if (!prompt || !detail) notFound();
  return (
    <>
      <PromptPage prompt={prompt} detail={detail} />
      <SiteChrome />
    </>
  );
}
