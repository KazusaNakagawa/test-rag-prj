import dotenv from "dotenv";
import { Client } from "@notionhq/client";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "../src/lib/env";

type RichTextItem = {
  plain_text: string;
};

function resolveEnvPath(args: string[]) {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-f" || arg === "--env" || arg === "--env-file") {
      return args[i + 1];
    }
    if (arg.startsWith("--env=")) {
      return arg.slice("--env=".length);
    }
    if (arg.startsWith("--env-file=")) {
      return arg.slice("--env-file=".length);
    }
  }
  const first = args[0];
  if (first && !first.startsWith("-")) {
    return first;
  }
  return undefined;
}

const envArgs = process.argv.slice(2);
const envPath =
  resolveEnvPath(envArgs) ?? process.env.DOTENV_CONFIG_PATH ?? undefined;
dotenv.config(envPath ? { path: envPath } : undefined);

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
const tenantId = requireEnv("NOTION_TENANT_ID");
const ownerId = process.env.NOTION_OWNER_ID || null;

/**
 * Concatenates the `plain_text` fields of each RichTextItem into a single string.
 *
 * @param richText - Optional array of RichTextItem objects to extract text from
 * @returns The concatenated plain text from `richText`, or an empty string if `richText` is undefined
 */
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

/**
 * Ingests a Notion page into the documents table by extracting text, chunking it, embedding chunks, and storing them with tenant and ownership metadata.
 *
 * @param page - Notion page object; must include `id`, `url`, `last_edited_time`, and properties used to derive the title.
 * @throws Error if inserting chunk rows into the documents table fails.
 */
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
    .eq("source_id", page.id)
    .eq("source_db_id", databaseId)
    .eq("tenant_id", tenantId);

  const rows = chunks.map((chunk, index) => ({
    tenant_id: tenantId,
    owner_id: ownerId,
    source: "notion",
    source_id: page.id,
    source_db_id: databaseId,
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

/**
 * Ingests all pages from the configured Notion database into the application's document store.
 *
 * Upserts a `document_sources` record for the Notion database (including tenant and owner metadata) and throws if that upsert fails. Then pages from the Notion database are retrieved (handling pagination); if no pages are found a message is logged and the function returns. Each retrieved page is processed by calling `ingestPage`.
 */
async function ingestDatabase() {
  const { error: sourceError } = await supabase
    .from("document_sources")
    .upsert(
      {
        source: "notion",
        source_db_id: databaseId,
        tenant_id: tenantId,
        owner_id: ownerId,
        is_searchable: true,
      },
      { onConflict: "source,source_db_id,tenant_id" }
    );
  if (sourceError) {
    throw new Error(`Failed to upsert document source: ${sourceError.message}`);
  }

  let cursor: string | undefined;
  const pages: any[] = [];

  do {
    const response = await queryDatabasePages(databaseId, cursor);
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

async function queryDatabasePages(
  targetDatabaseId: string,
  startCursor?: string
) {
  const databasesApi = (notion as any).databases;
  if (databasesApi && typeof databasesApi.query === "function") {
    return databasesApi.query({
      database_id: targetDatabaseId,
      start_cursor: startCursor,
      page_size: 100,
    });
  }

  const database = await notion.databases.retrieve({
    database_id: targetDatabaseId,
  });
  const dataSourceId = (database as any).data_sources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error(
      "No data source found for the database. Check NOTION_DATABASE_ID."
    );
  }

  const dataSourcesApi = (notion as any).dataSources;
  if (!dataSourcesApi || typeof dataSourcesApi.query !== "function") {
    throw new Error(
      "This Notion client does not support dataSources.query."
    );
  }

  return dataSourcesApi.query({
    data_source_id: dataSourceId,
    start_cursor: startCursor,
    page_size: 100,
    result_type: "page",
  });
}

ingestDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});