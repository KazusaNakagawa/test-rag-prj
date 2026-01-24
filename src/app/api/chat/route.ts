import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  jsonSchema,
  tool,
  stepCountIs,
} from "ai";
import { formatDocumentsForPrompt, retrieveDocuments } from "@/lib/rag";
import { appendAppLog } from "@/lib/app-logger";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

export const runtime = "nodejs";

function getUserText(message: any) {
  const parts = message?.parts ?? [];
  const text = parts
    .filter((part: any) => part?.type === "text")
    .map((part: any) => part.text)
    .join("");
  return text || message?.content || message?.text || "";
}

function getUserId(req: Request) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId
    );
  return isUuid ? userId : null;
}

function truncateTitle(text: string, maxLength = 60) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();
  const userId = getUserId(req);
  if (!userId) {
    return Response.json(
      { error: "x-user-id header is required." },
      { status: 400 }
    );
  }
  if (!chatId) {
    return Response.json(
      { error: "chatId is required to resume the session." },
      { status: 400 }
    );
  }
  if (!Array.isArray(messages)) {
    return Response.json(
      { error: "messages must be an array." },
      { status: 400 }
    );
  }

  const latestUserMessage = [...messages]
    .reverse()
    .find((message: { role: string }) => message.role === "user");
  const firstUserMessage = messages.find(
    (message: { role: string }) => message.role === "user"
  );

  const query = getUserText(latestUserMessage);
  const sessionTitle = truncateTitle(getUserText(firstUserMessage) || "New chat");
  const sessionId = chatId;
  const initialMatches = query ? await retrieveDocuments(query, 5) : [];
  const context = formatDocumentsForPrompt(initialMatches);
  const requestId = crypto.randomUUID();
  console.info("[rag] initial matches", {
    query,
    count: initialMatches.length,
    titles: initialMatches.map((match: any) => match.title ?? "Untitled"),
  });
  try {
    await appendAppLog({
      type: "chat_request",
      requestId,
      chatId: sessionId,
      query,
      messageCount: messages.length,
      matchTitles: initialMatches.map((match: any) => match.title ?? "Untitled"),
    });
  } catch (error) {
    console.warn("[rag] failed to write chat_request log", error);
  }

  const shouldEnableTools = initialMatches.length === 0;

  let historyMessages: { role: "user" | "assistant"; content: string }[] = [];
  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );
    const { data } = await supabase
      .from("chat_logs")
      .select("user_message, assistant_message")
      .eq("chat_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(50);
    historyMessages = (data ?? []).flatMap((row: any) => [
      { role: "user", content: row.user_message },
      { role: "assistant", content: row.assistant_message },
    ]);
  } catch {
    historyMessages = [];
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: [
      ...historyMessages,
      ...(query ? [{ role: "user", content: query }] : []),
    ],
    system: [
      "You are a precise RAG assistant for Notion knowledge.",
      "Always ground answers in the provided context and cite the doc numbers when possible.",
      "If the context is insufficient, ask a follow-up question instead of guessing.",
      "Format answers in Markdown. For numbered lists, keep the title on the same line as the number (e.g. `1. Title`).",
      "Use nested bullets under each numbered item with two spaces indentation, and avoid blank lines inside lists.",
      "End with a `References` section that lists the sources you used as markdown links: `- [Title](URL) (Doc N)`.",
      "Only include references for documents that appear in the context and have URLs.",
      "Context:",
      context,
    ].join("\n"),
    tools: shouldEnableTools
      ? {
          search_documents: tool({
            description:
              "Search the Notion knowledge base when you need more precise or additional context.",
            inputSchema: jsonSchema({
              type: "object",
              properties: {
                query: { type: "string" },
                topK: { type: "integer", minimum: 1, maximum: 12 },
              },
              required: ["query"],
              additionalProperties: false,
            }),
            execute: async (params: any) => {
              const { query, topK = 5 } = params ?? {};
              const matches = await retrieveDocuments(query, topK);
              return matches.map((match: any) => ({
                title: match.title,
                content: match.content,
                url: match.url,
                similarity: match.similarity,
              }));
            },
          }) as any,
        }
      : undefined,
    toolChoice: shouldEnableTools ? "auto" : "none",
    stopWhen: stepCountIs(3),
    onFinish: async (event) => {
      const text = event.text ?? "";
      const usage = event.usage ?? {};
      const payload = {
        chat_id: sessionId,
        user_id: userId,
        user_message: query,
        assistant_message: text,
        model: "gpt-4o-mini",
        finish_reason: event.finishReason ?? null,
        prompt_tokens: usage.promptTokens ?? null,
        completion_tokens: usage.completionTokens ?? null,
        total_tokens: usage.totalTokens ?? null,
        metadata: {
          request_id: requestId,
          match_titles: initialMatches.map(
            (match: any) => match.title ?? "Untitled"
          ),
        },
      };

      try {
        const supabase = createClient(
          requireEnv("SUPABASE_URL"),
          requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
          { auth: { persistSession: false } }
        );
        const { data: existingSession } = await supabase
          .from("chat_sessions")
          .select("id, title")
          .eq("id", sessionId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!existingSession) {
          await supabase
            .from("chat_sessions")
            .insert({ id: sessionId, user_id: userId, title: sessionTitle });
        } else if (!existingSession.title && sessionTitle) {
          await supabase
            .from("chat_sessions")
            .update({ title: sessionTitle })
            .eq("id", sessionId)
            .eq("user_id", userId);
        }
        await supabase
          .from("chat_sessions")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", sessionId)
          .eq("user_id", userId);
        const { error } = await supabase.from("chat_logs").insert(payload);
        if (error) {
          throw error;
        }
      } catch (error) {
        await appendAppLog({
          type: "chat_log_error",
          requestId,
          message: error instanceof Error ? error.message : String(error),
        });
      }

      await appendAppLog({
        type: "chat_response",
        requestId,
        finishReason: event.finishReason ?? null,
        promptTokens: usage.promptTokens ?? null,
        completionTokens: usage.completionTokens ?? null,
        totalTokens: usage.totalTokens ?? null,
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
