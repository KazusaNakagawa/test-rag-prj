/**
 * Marketing hero shown when the user is signed out.
 */
export default function LandingHero() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-4xl flex-col items-center justify-center px-6 pb-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-subtle)]">
        Notion RAG Agent
      </p>
      <h1 className="mt-4 font-serif text-4xl leading-tight text-[var(--text-primary)] md:text-5xl">
        自分の知見で答える
        <br />
        パーソナルAIラボ
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
        ログイン後は左に履歴、右にチャット画面を表示します。右上のアイコンからサインインできます。
      </p>
    </main>
  );
}
