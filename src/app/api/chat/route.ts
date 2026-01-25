import { openai } from "@ai-sdk/openai";
import {
  streamText,
  jsonSchema,
  tool,
  stepCountIs,
} from "ai";
import type { ModelMessage } from "ai";
import { formatDocumentsForPrompt, retrieveDocuments } from "@/lib/rag";
import { appendAppLog } from "@/lib/app-logger";
import { requireUser } from "@/lib/supabase-server";

export const runtime = "nodejs";

function getUserText(message: any) {
  const parts = message?.parts ?? [];
  const text = parts
    .filter((part: any) => part?.type === "text")
    .map((part: any) => part.text)
    .join("");
  return text || message?.content || message?.text || "";
}

function truncateTitle(text: string, maxLength = 60) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength)}…`;
}

export async function POST(req: Request) {
  const { messages, chatId } = await req.json();
  const auth = await requireUser(req);
  if ("error" in auth) {
    return auth.error;
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

  let historyMessages: ModelMessage[] = [];
  try {
    const { data } = await auth.supabase
      .from("chat_logs")
      .select("user_message, assistant_message")
      .eq("chat_id", sessionId)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true })
      .limit(50);
    historyMessages = (data ?? []).flatMap((row: any) => [
      { role: "user", content: row.user_message } as const,
      { role: "assistant", content: row.assistant_message } as const,
    ]);
  } catch {
    historyMessages = [];
  }

  const modelMessages: ModelMessage[] = [
    ...historyMessages,
    ...(query ? ([{ role: "user", content: query }] as const) : []),
  ];

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: modelMessages,
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
      const usage = event.usage;
      const promptTokens = usage?.inputTokens ?? null;
      const completionTokens = usage?.outputTokens ?? null;
      const totalTokens = usage?.totalTokens ?? null;
      const payload = {
        chat_id: sessionId,
        user_id: auth.user.id,
        user_message: query,
        assistant_message: text,
        model: "gpt-4o-mini",
        finish_reason: event.finishReason ?? null,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        metadata: {
          request_id: requestId,
          match_titles: initialMatches.map(
            (match: any) => match.title ?? "Untitled"
          ),
        },
      };

      try {
        const { data: existingSession } = await auth.supabase
          .from("chat_sessions")
          .select("id, title")
          .eq("id", sessionId)
          .eq("user_id", auth.user.id)
          .maybeSingle();
        if (!existingSession) {
          await auth.supabase
            .from("chat_sessions")
            .insert({ id: sessionId, user_id: auth.user.id, title: sessionTitle });
        } else if (!existingSession.title && sessionTitle) {
          await auth.supabase
            .from("chat_sessions")
            .update({ title: sessionTitle })
            .eq("id", sessionId)
            .eq("user_id", auth.user.id);
        }
        await auth.supabase
          .from("chat_sessions")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", sessionId)
          .eq("user_id", auth.user.id);
        const { error } = await auth.supabase.from("chat_logs").insert(payload);
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

      try {
        await appendAppLog({
          type: "chat_response",
          requestId,
          finishReason: event.finishReason ?? null,
          promptTokens,
          completionTokens,
          totalTokens,
        });
      } catch (error) {
        await appendAppLog({
          type: "chat_log_error",
          requestId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
