import type { ThemeMode } from "@/hooks/useThemeMode";

type SettingsModalProps = {
  open: boolean;
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  onClose: () => void;
};

const themeOptions: { value: ThemeMode; label: string; description: string }[] = [
  {
    value: "light",
    label: "ライト",
    description: "明るい配色で固定します。",
  },
  {
    value: "dark",
    label: "ダーク",
    description: "暗い配色で固定します。",
  },
  {
    value: "system",
    label: "システム",
    description: "OSの外観設定に合わせます。",
  },
];

/**
 * Settings modal for appearance preferences.
 */
export default function SettingsModal({
  open,
  mode,
  onModeChange,
  onClose,
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[var(--overlay)] px-6">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-6 text-sm text-[var(--text-primary)] shadow-[0_30px_70px_-40px_rgba(0,0,0,0.5)] backdrop-blur"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-subtle)]">
              Settings
            </p>
            <h2 className="mt-2 text-xl font-semibold">外観</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              ダークモード・ライトモード・システム同期を切り替えます。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--panel-border-strong)]"
          >
            閉じる
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {themeOptions.map((option) => {
            const isActive = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onModeChange(option.value)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                    : "border-[var(--panel-border)] bg-[var(--panel-muted)] hover:border-[var(--panel-border-strong)]"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {option.description}
                  </p>
                </div>
                <span
                  className={`h-4 w-4 rounded-full border ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--accent)]"
                      : "border-[var(--panel-border-strong)]"
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
