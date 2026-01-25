"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase-browser";
import AppHeader from "@/components/AppHeader";
import AuthModal from "@/components/AuthModal";
import LandingHero from "@/components/LandingHero";
import Sidebar from "@/components/Sidebar";
import ChatPanel from "@/components/ChatPanel";

/**
 * Extract a displayable string from a chat message, including tool call labels.
 */
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

/**
 * Create a UUID v4 using the Web Crypto API, with a fallback implementation.
 */
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

/**
 * Generate a chat session id and fail fast if it cannot be created.
 */
function generateChatId() {
  const id = generateUuidV4();
  if (!id) {
    throw new Error("Failed to generate chat ID.");
  }
  return id;
}

/**
 * Main chat page: handles auth state, chat sessions, and layout rendering.
 */
export default function Home() {
  const { messages, sendMessage, status, setMessages } = useChat();
  const [input, setInput] = useState("");
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
    const refreshSession = () =>
      supabaseBrowser.auth
        .getSession()
        .then(({ data }) => setSession(data.session ?? null))
        .catch(() => null);

    refreshSession();

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };

    window.addEventListener("focus", refreshSession);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("focus", refreshSession);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (session?.user) {
      setIsAuthModalOpen(false);
      setAuthNotice(null);
    }
  }, [session?.user]);

  useEffect(() => {
    let isMounted = true;
    const accessToken = session?.access_token;
    if (!accessToken) return () => undefined;
    fetch("/api/chat/sessions", {
      headers: { Authorization: `Bearer ${accessToken}` },
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
  }, [chatId, session?.access_token]);

  /**
   * Fetch and hydrate messages for a selected chat session.
   */
  const loadChatLogs = (targetChatId: string) => {
    const accessToken = session?.access_token;
    if (!accessToken) return Promise.resolve();
    setIsLoadingHistory(true);
    return fetch(`/api/chat/logs?chat_id=${targetChatId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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
    if (!chatId || !session?.access_token) return;
    loadChatLogs(chatId);
  }, [chatId, session?.access_token, setMessages]);

  /**
   * Refresh the list of chat sessions for the signed-in user.
   */
  const refreshSessions = () =>
    session?.access_token
      ? fetch("/api/chat/sessions", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((response) => response.json())
          .then((payload) => setSessions(payload?.sessions ?? []))
          .catch(() => null)
      : Promise.resolve();

  /**
   * Trigger Supabase magic-link sign-in with basic client-side validation.
   */
  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthNotice(null);
    if (!authEmail.trim()) {
      setAuthNotice("メールアドレスを入力してください。");
      setIsAuthModalOpen(true);
      return;
    }
    const { error } = await supabaseBrowser.auth.signInWithOtp({
      email: authEmail.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      setAuthNotice(error.message);
      setIsAuthModalOpen(true);
      return;
    }
    setAuthNotice(
      "メールを送信しました。受信箱のリンクを開いてログインを完了してください。"
    );
    setIsAuthModalOpen(true);
  };

  /**
   * Clear auth state and reset chat session data on sign-out.
   */
  const handleSignOut = async () => {
    setAuthNotice(null);
    await supabaseBrowser.auth.signOut();
    setSessions([]);
    setChatId(null);
    setMessages([]);
  };

  /**
   * Start a new empty chat session with a fresh id.
   */
  const handleNewChat = () => {
    const nextChatId = generateChatId();
    setChatId(nextChatId);
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#2a2d33,_#16181c_55%,_#0f1115)] text-stone-100">
      <AppHeader
        session={session}
        authEmail={authEmail}
        onAuthEmailChange={setAuthEmail}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
      <AuthModal
        open={isAuthModalOpen}
        notice={authNotice}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {!session?.user ? (
        <LandingHero />
      ) : (
        <main className="mx-auto w-full max-w-6xl px-6 pb-12 pt-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
            <Sidebar
              sessions={sessions}
              chatId={chatId}
              onNewChat={handleNewChat}
              onSelectChat={(id) => {
                setChatId(id);
                setMessages([]);
              }}
            />

            <ChatPanel
              containerRef={containerRef}
              isLoadingHistory={isLoadingHistory}
              messages={messages}
              previewMarkdown={previewMarkdown}
              renderMessageText={renderMessageText}
              input={input}
              onInputChange={setInput}
              onSubmit={async (event) => {
                event.preventDefault();
                if (isBusy || !input.trim()) return;
                const accessToken = session?.access_token;
                if (!accessToken) {
                  setAuthNotice("サインインしてからチャットを開始してください。");
                  return;
                }
                let activeChatId = chatId;
                if (!activeChatId) {
                  activeChatId = generateChatId();
                  setChatId(activeChatId);
                  setMessages([]);
                }
                await sendMessage(
                  { text: input },
                  {
                    body: { chatId: activeChatId },
                    headers: { Authorization: `Bearer ${accessToken}` },
                  }
                );
                setInput("");
                refreshSessions();
              }}
              isBusy={isBusy}
              canSend={Boolean(session?.access_token)}
            />
          </div>
        </main>
      )}
    </div>
  );
}
