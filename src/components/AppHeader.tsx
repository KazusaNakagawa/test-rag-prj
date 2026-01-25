"use client";

import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

type AppHeaderProps = {
  session: Session | null;
  authEmail: string;
  onAuthEmailChange: (value: string) => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
};

/**
 * Top navigation bar with branding and auth controls.
 */
export default function AppHeader({
  session,
  authEmail,
  onAuthEmailChange,
  onSignIn,
  onSignOut,
  onOpenSettings,
}: AppHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isUserMenuOpen]);

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--panel-border)] bg-[var(--header-bg)] px-6 py-4 text-[var(--text-primary)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent)] text-xs font-semibold text-white">
            AI
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Notion RAG Agent
            </p>
            <p className="text-xs text-[var(--text-subtle)]">
              Personal Knowledge Chat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--panel-muted)] text-xs font-semibold text-[var(--text-primary)] transition hover:border hover:border-[var(--panel-border-strong)]"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
              >
                {session.user.email?.slice(0, 2).toUpperCase() ?? "ME"}
              </button>
              {isUserMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-2 text-xs text-[var(--text-primary)] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.5)] backdrop-blur"
                >
                  <div className="px-3 py-2 text-[11px] text-[var(--text-subtle)]">
                    {session.user.email ?? "Signed in"}
                  </div>
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-[var(--panel-muted)]"
                  >
                    設定
                  </button>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-400 transition hover:bg-[var(--panel-muted)]"
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={onSignIn} className="flex items-center gap-2">
              <input
                type="email"
                value={authEmail}
                onChange={(event) => onAuthEmailChange(event.target.value)}
                placeholder="you@example.com"
                className="w-44 rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-2 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-subtle)] sm:w-56"
              />
              <button
                type="submit"
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-dark)]"
              >
                Sign in
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-subtle)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M4.5 20c1.9-3.7 5-5.5 7.5-5.5S17.1 16.3 19.5 20" />
                </svg>
              </div>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
