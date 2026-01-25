type SessionItem = { id: string; title: string | null; updated_at: string | null };

type SidebarProps = {
  sessions: SessionItem[];
  chatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
};

export default function Sidebar({
  sessions,
  chatId,
  onSelectChat,
  onNewChat,
}: SidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-4 rounded-[28px] border border-white/10 bg-stone-900/80 p-5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.6)] backdrop-blur lg:w-[26%] lg:min-w-[240px]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
          Chats
        </p>
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-stone-200 transition hover:border-[var(--accent)] hover:text-white"
        >
          New
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {sessions.length === 0 && (
          <p className="text-xs text-stone-400">まだチャット履歴がありません。</p>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelectChat(session.id)}
            className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
              chatId === session.id
                ? "border-[var(--accent)] bg-[rgba(255,120,64,0.18)] text-white"
                : "border-white/10 bg-white/5 text-stone-200 hover:border-[var(--accent)]"
            }`}
          >
            {session.title || "New chat"}
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-white/10 pt-3">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-stone-200 transition hover:border-[var(--accent)] hover:text-white"
        >
          <span className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M12 2.5v2.2M12 19.3v2.2M4.2 12H2m20 0h-2.2M5.4 5.4l1.6 1.6M16.9 16.9l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
            設定
          </span>
          <span className="text-xs text-stone-400">Ctrl + ,</span>
        </button>
      </div>
    </aside>
  );
}
