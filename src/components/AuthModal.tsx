type AuthModalProps = {
  open: boolean;
  notice: string | null;
  onClose: () => void;
};

export default function AuthModal({ open, notice, onClose }: AuthModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-stone-950/95 p-6 text-sm text-stone-100 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.8)]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-400">
          Sign in
        </p>
        <h2 className="mt-3 text-xl font-semibold text-white">
          メールを確認してください
        </h2>
        <p className="mt-3 text-sm text-stone-300">
          {notice ??
            "受信箱のリンクを開いてください。同じブラウザで開くと、この画面が自動でログイン状態に切り替わります。"}
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-stone-200 transition hover:border-white/30 hover:text-white"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
