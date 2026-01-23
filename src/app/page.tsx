"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const prompts = [
  "Notionの中で最近のプロジェクト概要を教えて",
  "自分の強みを3つに要約して",
  "学習メモから今月の改善点を抽出して",
];

function renderMessageText(message: UIMessage) {
  const parts = message.parts ?? [];
  const text = parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  if (text) {
    return text;
  }

  const toolParts = parts.filter(
    (part) => part.type === "dynamic-tool" || part.type.startsWith("tool-")
  );
  if (toolParts.length > 0) {
    return toolParts
      .map((part) => {
        if (part.type === "dynamic-tool") {
          return `[Tool] ${part.toolName}`;
        }
        return `[Tool] ${part.type.replace("tool-", "")}`;
      })
      .join("\n");
  }

  return "表示できる内容がありません。";
}

export default function Home() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") !== "1") return;
    fetch("/api/preview")
      .then((response) => response.text())
      .then((text) => setPreviewMarkdown(text))
      .catch(() => setPreviewMarkdown(null));
  }, []);

  return (
    <div className="min-h-screen px-6 pb-12 pt-10 text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:grid lg:grid-cols-[1.05fr_1.6fr]">
        <section className="flex flex-col gap-6 rounded-[32px] border border-stone-200 bg-[rgba(255,253,248,0.8)] p-8 shadow-[0_24px_80px_-48px_rgba(15,10,5,0.35)] backdrop-blur">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.3em] text-stone-500">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            Notion RAG Agent
          </div>
          <div className="space-y-4">
            <h1 className="font-serif text-4xl leading-tight text-stone-950 md:text-5xl">
              自分の知見で答える
              <br />
              パーソナルAIラボ
            </h1>
            <p className="text-base leading-relaxed text-stone-600">
              Notionの知識ベースを検索し、関連情報を引用しながら返答するRAG +
              エージェント構成です。質問が曖昧なときは、必要な情報を聞き返します。
            </p>
          </div>
          <div className="space-y-3 rounded-2xl border border-stone-200 bg-white/80 p-5 text-sm text-stone-600">
            <p className="font-semibold text-stone-900">利用フロー</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>NotionからETLを実行してベクター保存</li>
              <li>検索 + 生成を組み合わせて回答</li>
              <li>必要に応じて追加検索ツールを呼び出し</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Quick prompts
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 transition hover:border-[var(--accent)] hover:text-stone-950"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="flex h-[660px] flex-col rounded-[28px] border border-stone-200 bg-white/70 p-5 shadow-[0_24px_70px_-50px_rgba(15,10,5,0.35)] backdrop-blur">
          <div
            ref={containerRef}
            className="flex-1 space-y-3 overflow-y-auto rounded-[24px] border border-stone-200 bg-white/70 p-4"
          >
            {messages.length === 0 && (
              <div className="space-y-3 text-sm text-stone-500">
                <p>まだチャット履歴がありません。</p>
                <p>右下の入力欄から質問を投げてください。</p>
              </div>
            )}
            {previewMarkdown && (
              <div className="flex justify-start">
                <div className="w-full rounded-2xl bg-stone-100 px-4 py-2 text-sm leading-relaxed text-stone-800 shadow-sm">
                  <div className="markdown markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {previewMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm ${
                    message.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap bg-[var(--accent)] text-white"
                      : "w-full whitespace-normal bg-stone-100 text-stone-800"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="markdown markdown-body">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {renderMessageText(message)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    renderMessageText(message)
                  )}
                </div>
              </div>
            ))}
          </div>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!input.trim()) return;
              await sendMessage({ text: input });
              setInput("");
            }}
            className="mt-4 flex gap-3 rounded-2xl border border-stone-200 bg-white/90 p-3"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Notionの知識を検索して質問する"
              className="flex-1 bg-transparent px-3 text-sm text-stone-800 outline-none placeholder:text-stone-400"
            />
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)] disabled:opacity-60"
            >
              {isBusy ? "送信中..." : "送信"}
            </button>
          </form>
          <p className="mt-3 text-xs text-stone-500">
            モデルは回答時にNotionデータを検索します。重要な情報は引用番号で確認してください。
          </p>
        </section>
      </main>
    </div>
  );
}
