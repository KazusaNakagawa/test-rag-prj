import "dotenv/config";
import { Client } from "@notionhq/client";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "../src/lib/env";

type RichTextItem = {
  plain_text: string;
};

const notion = new Client({
  auth: requireEnv("NOTION_API_KEY"),
});

const openai = new OpenAI({
  apiKey: requireEnv("OPENAI_API_KEY"),
});

const supabase = createClient(
  requireEnv("SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { persistSession: false },
  }
);

const databaseId = requireEnv("NOTION_DATABASE_ID");

function getPlainText(richText?: RichTextItem[]) {
  if (!richText) return "";
  return richText.map((item) => item.plain_text).join("");
}

function chunkText(text: string, chunkSize = 900, overlap = 120) {
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    const end = Math.min(index + chunkSize, text.length);
    chunks.push(text.slice(index, end).trim());
    if (end === text.length) break;
    index = Math.max(0, end - overlap);
  }
  return chunks.filter(Boolean);
}

async function listBlockChildren(blockId: string) {
  const blocks: any[] = [];
  let cursor: string | undefined;
  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    blocks.push(...response.results);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);
  return blocks;
}

function extractBlockText(block: any) {
  const type = block.type;
  const payload = block[type];
  if (!payload) return "";

  if (payload.rich_text) {
    return getPlainText(payload.rich_text);
  }

  if (type === "code") {
    return getPlainText(payload.rich_text);
  }

  if (type === "heading_1" || type === "heading_2" || type === "heading_3") {
    return getPlainText(payload.rich_text);
  }

  if (type === "to_do" || type === "bulleted_list_item" || type === "numbered_list_item") {
    return getPlainText(payload.rich_text);
  }

  if (type === "quote" || type === "callout" || type === "toggle") {
    return getPlainText(payload.rich_text);
  }

  return "";
}

async function collectBlockText(blockId: string): Promise<string[]> {
  const blocks = await listBlockChildren(blockId);
  const texts: string[] = [];

  for (const block of blocks) {
    const text = extractBlockText(block);
    if (text) {
      texts.push(text);
    }

    if (block.has_children) {
      const childTexts = await collectBlockText(block.id);
      texts.push(...childTexts);
    }
  }

  return texts;
}

function getPageTitle(page: any) {
  const properties = page.properties ?? {};
  const titleProperty = Object.values(properties).find(
    (prop: any) => prop.type === "title"
  ) as { title?: RichTextItem[] } | undefined;

  return getPlainText(titleProperty?.title) || "Untitled";
}

async function embedChunks(chunks: string[]) {
  const embeddings: number[][] = [];
  const batchSize = 64;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    embeddings.push(...response.data.map((item) => item.embedding));
  }

  return embeddings;
}

async function ingestPage(page: any) {
  const title = getPageTitle(page);
  const texts = await collectBlockText(page.id);
  const content = texts.join("\n\n").trim();

  if (!content) {
    console.log(`Skipping empty page: ${title}`);
    return;
  }

  const chunks = chunkText(content);
  const embeddings = await embedChunks(chunks);

  await supabase
    .from("documents")
    .delete()
    .eq("source", "notion")
    .eq("source_id", page.id);

  const rows = chunks.map((chunk, index) => ({
    source: "notion",
    source_id: page.id,
    title,
    content: chunk,
    chunk_index: index,
    embedding: embeddings[index],
    url: page.url ?? null,
    metadata: {
      notion_url: page.url ?? null,
      last_edited_time: page.last_edited_time,
    },
  }));

  const { error } = await supabase.from("documents").insert(rows);
  if (error) {
    throw new Error(`Failed to insert rows for ${title}: ${error.message}`);
  }

  console.log(`Ingested ${title} (${rows.length} chunks)`);
}

async function ingestDatabase() {
  let cursor: string | undefined;
  const pages: any[] = [];

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    pages.push(...response.results);
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  if (pages.length === 0) {
    console.log("No pages found in the Notion database.");
    return;
  }

  for (const page of pages) {
    await ingestPage(page);
  }
}

ingestDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
