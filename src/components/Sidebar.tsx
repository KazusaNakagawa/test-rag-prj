type SessionItem = { id: string; title: string | null; updated_at: string | null };

type SidebarProps = {
  sessions: SessionItem[];
  chatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
};

const MAX_SESSION_TITLE_LENGTH = 12;

/**
 * Clamp session titles to a compact label for the sidebar list.
 */
function formatSessionTitle(title: string | null) {
  const fallback = "New chat";
  const value = title?.trim() || fallback;
  if (value.length <= MAX_SESSION_TITLE_LENGTH) return value;
  return `${value.slice(0, MAX_SESSION_TITLE_LENGTH)}...`;
}

/**
 * Left sidebar listing chat sessions and quick actions.
 */
export default function Sidebar({
  sessions,
  chatId,
  onSelectChat,
  onNewChat,
  onOpenSettings,
}: SidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-4 rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-[var(--text-primary)] shadow-[0_20px_60px_-45px_rgba(0,0,0,0.4)] backdrop-blur lg:w-[26%] lg:min-w-[240px]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-subtle)]">
          Chats
        </p>
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)]"
        >
          New
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {sessions.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">まだチャット履歴がありません。</p>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelectChat(session.id)}
            className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${
              chatId === session.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                : "border-[var(--panel-border)] bg-[var(--panel-muted)] hover:border-[var(--accent)]"
            }`}
          >
            {formatSessionTitle(session.title)}
          </button>
        ))}
      </div>
      <div className="mt-auto border-t border-[var(--panel-border)] pt-3">
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex w-full items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--accent)]"
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
          <span className="text-xs text-[var(--text-subtle)]">Ctrl + ,</span>
        </button>
      </div>
    </aside>
  );
}
