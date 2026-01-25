type AuthModalProps = {
  open: boolean;
  notice: string | null;
  onClose: () => void;
};

/**
 * Modal prompt shown after starting magic-link sign-in.
 */
export default function AuthModal({ open, notice, onClose }: AuthModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-[var(--overlay)] px-6">
      <div className="w-full max-w-md rounded-3xl border border-[var(--panel-border)] bg-[var(--panel)] p-6 text-sm text-[var(--text-primary)] shadow-[0_30px_70px_-40px_rgba(0,0,0,0.6)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-subtle)]">
          Sign in
        </p>
        <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
          メールを確認してください
        </h2>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {notice ??
            "受信箱のリンクを開いてください。同じブラウザで開くと、この画面が自動でログイン状態に切り替わります。"}
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--panel-border)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--panel-border-strong)]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
