import type { UIMessage } from "ai";
import type { FormEvent, RefObject } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatPanelProps = {
  containerRef: RefObject<HTMLDivElement>;
  isLoadingHistory: boolean;
  messages: UIMessage[];
  previewMarkdown: string | null;
  renderMessageText: (message: UIMessage) => string;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isBusy: boolean;
  canSend: boolean;
};

export default function ChatPanel({
  containerRef,
  isLoadingHistory,
  messages,
  previewMarkdown,
  renderMessageText,
  input,
  onInputChange,
  onSubmit,
  isBusy,
  canSend,
}: ChatPanelProps) {
  return (
    <section className="flex h-[70vh] min-h-[520px] flex-1 flex-col rounded-[28px] border border-white/10 bg-stone-900/80 p-5 shadow-[0_24px_70px_-50px_rgba(0,0,0,0.7)] backdrop-blur">
      <div
        ref={containerRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-[24px] border border-white/10 bg-black/30 p-4"
      >
        {isLoadingHistory && (
          <div className="text-sm text-stone-400">履歴を読み込み中...</div>
        )}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="space-y-3 text-sm text-stone-400">
            <p>まだチャット履歴がありません。</p>
            <p>右下の入力欄から質問を投げてください。</p>
          </div>
        )}
        {previewMarkdown && (
          <div className="flex justify-start">
            <div className="w-full rounded-2xl bg-white/10 px-4 py-2 text-sm leading-relaxed text-stone-100 shadow-sm">
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
                  : "w-full whitespace-normal bg-white/10 text-stone-100"
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
        onSubmit={onSubmit}
        className="mt-4 flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
      >
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Notionの知識を検索して質問する"
          className="flex-1 bg-transparent px-3 text-sm text-stone-100 outline-none placeholder:text-stone-500"
        />
        <button
          type="submit"
          disabled={isBusy || !canSend}
          className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-dark)] disabled:opacity-60"
        >
          {isBusy ? "送信中..." : "送信"}
        </button>
      </form>
      <p className="mt-3 text-xs text-stone-400">
        モデルは回答時にNotionデータを検索します。重要な情報は引用番号で確認してください。
      </p>
    </section>
  );
}
