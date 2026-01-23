import { openai } from "@ai-sdk/openai";
import {
  streamText,
  convertToModelMessages,
  jsonSchema,
  tool,
  stepCountIs,
} from "ai";
import { formatDocumentsForPrompt, retrieveDocuments } from "@/lib/rag";

export const runtime = "nodejs";

function getUserText(message: any) {
  const parts = message?.parts ?? [];
  const text = parts
    .filter((part: any) => part?.type === "text")
    .map((part: any) => part.text)
    .join("");
  return text || message?.content || message?.text || "";
}

export async function POST(req: Request) {
  const { messages } = await req.json();
  const latestUserMessage = [...messages]
    .reverse()
    .find((message: { role: string }) => message.role === "user");

  const query = getUserText(latestUserMessage);
  const initialMatches = query ? await retrieveDocuments(query, 5) : [];
  const context = formatDocumentsForPrompt(initialMatches);
  console.info("[rag] initial matches", {
    query,
    count: initialMatches.length,
    titles: initialMatches.map((match: any) => match.title ?? "Untitled"),
  });

  const shouldEnableTools = initialMatches.length === 0;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages: await convertToModelMessages(messages),
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
  });

  return result.toUIMessageStreamResponse();
}
