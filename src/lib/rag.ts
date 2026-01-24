import OpenAI from "openai";
import { Client } from "@notionhq/client";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

type RagMatch = {
  id: string;
  source: string;
  source_id: string;
  title: string | null;
  content: string;
  chunk_index: number;
  url: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
};

type RichTextItem = {
  plain_text: string;
};

const openai = new OpenAI({
  apiKey: requireEnv("OPENAI_API_KEY"),
});

let supabaseClient:
  | ReturnType<typeof createClient>
  | null
  | undefined = undefined;

function getSupabaseClient() {
  if (supabaseClient !== undefined) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    supabaseClient = null;
    return supabaseClient;
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
  return supabaseClient;
}

function getPlainText(richText?: RichTextItem[]) {
  if (!richText) return "";
  return richText.map((item) => item.plain_text).join("");
}

function escapePostgrestLike(value: string) {
  return value.replace(/([\\%_"])/g, "\\$1");
}

function quotePostgrestValue(value: string) {
  return `"${value.replace(/(["\\])/g, "\\$1")}"`;
}

function extractKeywords(query: string) {
  const tokens =
    query.match(/[A-Za-z0-9][A-Za-z0-9+._-]*/g)?.map((token) => token.trim()) ??
    [];
  return Array.from(new Set(tokens.filter(Boolean))).slice(0, 6);
}

function chunkText(text: string, chunkSize = 1200) {
  if (text.length <= chunkSize) {
    return [text];
  }
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += chunkSize) {
    chunks.push(text.slice(index, index + chunkSize).trim());
  }
  return chunks.filter(Boolean);
}

async function listBlockChildren(notion: Client, blockId: string) {
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

  if (
    type === "to_do" ||
    type === "bulleted_list_item" ||
    type === "numbered_list_item"
  ) {
    return getPlainText(payload.rich_text);
  }

  if (type === "quote" || type === "callout" || type === "toggle") {
    return getPlainText(payload.rich_text);
  }

  return "";
}

async function collectBlockText(notion: Client, blockId: string) {
  const blocks = await listBlockChildren(notion, blockId);
  const texts: string[] = [];

  for (const block of blocks) {
    const text = extractBlockText(block);
    if (text) {
      texts.push(text);
    }

    if (block.has_children) {
      const childTexts = await collectBlockText(notion, block.id);
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

function scoreByKeywords(match: RagMatch, keywords: string[]) {
  if (keywords.length === 0) return 0;
  const title = (match.title ?? "").toLowerCase();
  const content = match.content.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    const needle = keyword.toLowerCase();
    if (!needle) continue;
    if (title.includes(needle)) score += 2;
    if (content.includes(needle)) score += 1;
  }
  return score;
}

async function retrieveFromNotion(query: string, topK: number) {
  const notionApiKey = requireEnv("NOTION_API_KEY");
  const databaseId = process.env.NOTION_DATABASE_ID;
  const notion = new Client({ auth: notionApiKey });

  console.info("[notion] search start", { query, topK, databaseId });
  const response = await notion.search({
    query,
    page_size: Math.min(topK * 2, 10),
    filter: { property: "object", value: "page" },
  });

  const pages = response.results
    .filter((result: any) => {
      if (!databaseId) return true;
      const parent = result.parent ?? {};
      return parent.type === "database_id" && parent.database_id === databaseId;
    })
    .slice(0, topK);

  console.info("[notion] search results", {
    total: response.results.length,
    filtered: pages.length,
    titles: pages.map((page: any) => getPageTitle(page)),
  });

  const matches: RagMatch[] = [];
  for (const page of pages) {
    const title = getPageTitle(page);
    const texts = await collectBlockText(notion, page.id);
    const content = texts.join("\n\n").trim();
    if (!content) continue;
    const chunks = chunkText(content);
    const chunk = chunks[0];
    matches.push({
      id: page.id,
      source: "notion",
      source_id: page.id,
      title,
      content: chunk,
      chunk_index: 0,
      url: page.url ?? null,
      metadata: {
        notion_url: page.url ?? null,
        last_edited_time: page.last_edited_time,
      },
      similarity: 0.5,
    });
  }

  console.info("[notion] matches ready", { matches: matches.length });
  return matches;
}

export async function retrieveDocuments(query: string, topK = 5) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return retrieveFromNotion(query, topK);
  }

  const keywords = extractKeywords(query);

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const [embedding] = embeddingResponse.data;
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: embedding.embedding,
    match_count: Math.max(topK, 12),
  });

  if (error) {
    throw new Error(`Supabase search failed: ${error.message}`);
  }

  const vectorMatches = (data ?? []) as RagMatch[];

  let keywordMatches: RagMatch[] = [];
  if (keywords.length > 0) {
    const orFilters = keywords
      .flatMap((keyword) => {
        const escaped = escapePostgrestLike(keyword);
        const pattern = quotePostgrestValue(`*${escaped}*`);
        return [`title.ilike.${pattern}`, `content.ilike.${pattern}`];
      })
      .join(",");
    const { data: keywordData, error: keywordError } = await supabase
      .from("documents")
      .select(
        "id, source, source_id, title, content, chunk_index, url, metadata"
      )
      .or(orFilters)
      .limit(Math.max(topK, 12));
    if (keywordError) {
      throw new Error(`Supabase keyword search failed: ${keywordError.message}`);
    }
    keywordMatches = (keywordData ?? []).map((row: any) => ({
      ...row,
      similarity: 0,
    }));
  }

  const seen = new Set<string>();
  const merged: RagMatch[] = [];
  for (const match of [...vectorMatches, ...keywordMatches]) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    merged.push(match);
  }

  if (keywords.length > 0) {
    merged.sort((a, b) => {
      const scoreDiff =
        scoreByKeywords(b, keywords) - scoreByKeywords(a, keywords);
      if (scoreDiff !== 0) return scoreDiff;
      return b.similarity - a.similarity;
    });
  }

  return merged.slice(0, topK);
}

export function formatDocumentsForPrompt(matches: RagMatch[]) {
  if (matches.length === 0) {
    return "No relevant documents were found.";
  }

  return matches
    .map((match, index) => {
      const title = match.title ?? "Untitled";
      const urlLine = match.url ? `URL: ${match.url}` : "URL: n/a";
      return `# Doc ${index + 1}\nTitle: ${title}\n${urlLine}\nContent:\n${match.content}`;
    })
    .join("\n\n");
}
