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

function generateUuidV4() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
      .slice(6, 8)
      .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  return "";
}

function generateChatId() {
  const id = generateUuidV4();
  if (!id) {
    throw new Error("Failed to generate chat ID.");
  }
  return id;
}

function getOrCreateUserId() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem("rag_user_id");
  if (stored) return stored;
  const nextId = generateChatId();
  window.localStorage.setItem("rag_user_id", nextId);
  return nextId;
}

export default function Home() {
  const { messages, sendMessage, status, setMessages } = useChat();
  const [input, setInput] = useState("");
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<
    { id: string; title: string | null; updated_at: string | null }[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
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

  useEffect(() => {
    const storedUserId = getOrCreateUserId();
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!userId) return () => undefined;
    fetch("/api/chat/sessions", {
      headers: { "x-user-id": userId },
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!isMounted) return;
        const nextSessions = payload?.sessions ?? [];
        setSessions(nextSessions);
        if (!chatId && nextSessions.length > 0) {
          setChatId(nextSessions[0].id);
        }
      })
      .catch(() => null);
    return () => {
      isMounted = false;
    };
  }, [chatId, userId]);

  const loadChatLogs = (targetChatId: string) => {
    if (!userId) return Promise.resolve();
    setIsLoadingHistory(true);
    return fetch(`/api/chat/logs?chat_id=${targetChatId}`, {
      headers: { "x-user-id": userId },
    })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.messages) return;
        setMessages(payload.messages);
      })
      .catch(() => null)
      .finally(() => setIsLoadingHistory(false));
  };

  useEffect(() => {
    if (!chatId || !userId) return;
    loadChatLogs(chatId);
  }, [chatId, userId, setMessages]);

  const refreshSessions = () =>
    userId
      ? fetch("/api/chat/sessions", { headers: { "x-user-id": userId } })
          .then((response) => response.json())
          .then((payload) => setSessions(payload?.sessions ?? []))
          .catch(() => null)
      : Promise.resolve();

  const handleNewChat = () => {
    const nextChatId = generateChatId();
    setChatId(nextChatId);
    setMessages([]);
  };

  return (
    <div className="min-h-screen px-6 pb-12 pt-10 text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:grid lg:grid-cols-[0.6fr_1.05fr_1.6fr]">
        <aside className="flex flex-col gap-4 rounded-[28px] border border-stone-200 bg-white/70 p-5 shadow-[0_24px_70px_-50px_rgba(15,10,5,0.35)] backdrop-blur lg:h-[660px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
              Chats
            </p>
            <button
              type="button"
              onClick={handleNewChat}
              className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-semibold text-stone-700 transition hover:border-[var(--accent)] hover:text-stone-950"
            >
              New
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {sessions.length === 0 && (
              <p className="text-xs text-stone-500">
                まだチャット履歴がありません。
              </p>
            )}
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  setChatId(session.id);
                  setMessages([]);
                }}
                className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
                  chatId === session.id
                    ? "border-[var(--accent)] bg-[rgba(255,120,64,0.12)] text-stone-900"
                    : "border-stone-200 bg-white/80 text-stone-700 hover:border-[var(--accent)]"
                }`}
              >
                {session.title || "New chat"}
              </button>
            ))}
          </div>
        </aside>

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
            {isLoadingHistory && (
              <div className="text-sm text-stone-500">履歴を読み込み中...</div>
            )}
            {!isLoadingHistory && messages.length === 0 && (
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
              let activeChatId = chatId;
              if (!activeChatId) {
                activeChatId = generateChatId();
                setChatId(activeChatId);
                setMessages([]);
              }
              const activeUserId = userId ?? getOrCreateUserId();
              if (activeUserId && !userId) {
                setUserId(activeUserId);
              }
              await sendMessage(
                { text: input },
                {
                  body: { chatId: activeChatId },
                  headers: activeUserId
                    ? { "x-user-id": activeUserId }
                    : undefined,
                }
              );
              setInput("");
              refreshSessions();
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
