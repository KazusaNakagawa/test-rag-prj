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
    <header className="sticky top-0 z-10 border-b border-white/5 bg-black/40 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent)] text-xs font-semibold text-white">
            AI
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Notion RAG Agent</p>
            <p className="text-xs text-stone-400">Personal Knowledge Chat</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white transition hover:bg-white/20"
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
              >
                {session.user.email?.slice(0, 2).toUpperCase() ?? "ME"}
              </button>
              {isUserMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-stone-950/95 p-2 text-xs text-stone-100 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.7)]"
                >
                  <div className="px-3 py-2 text-[11px] text-stone-400">
                    {session.user.email ?? "Signed in"}
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/10"
                  >
                    設定
                  </button>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-300 transition hover:bg-white/10"
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
                className="w-44 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-stone-100 outline-none placeholder:text-stone-500 sm:w-56"
              />
              <button
                type="submit"
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-dark)]"
              >
                Sign in
              </button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-stone-300">
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
