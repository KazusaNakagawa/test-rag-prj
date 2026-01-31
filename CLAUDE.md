# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

NotionのデータをRAGで検索し、Vercel AI SDKで対話するNext.jsアプリです。

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS v4
- **AI/LLM**: Vercel AI SDK + OpenAI
- **データベース**: Supabase (PostgreSQL + pgvector)
- **データソース**: Notion API

## よく使うコマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# リント
npm run lint

# Notionデータ取り込み
npm run ingest:notion -- .env.local
```

## プロジェクト構成

```
src/
├── app/           # Next.js App Router (ページ、APIルート)
│   └── api/       # APIエンドポイント
├── components/    # Reactコンポーネント
├── hooks/         # カスタムフック
└── lib/           # ユーティリティ、設定
    ├── rag.ts         # RAG検索ロジック
    ├── supabase-*.ts  # Supabaseクライアント
    └── ai-config.ts   # AI設定

scripts/           # データ取り込みスクリプト
supabase/          # スキーマ、SQL
docs/              # ドキュメント
```

## 重要な環境変数

- `OPENAI_API_KEY` - OpenAI APIキー
- `OPENAI_CHAT_MODEL` - 使用するモデル (デフォルト: gpt-4o-mini)
- `RAG_MIN_SIMILARITY` - RAG検索の類似度閾値 (デフォルト: 0.25)
- `RAG_TOOL_THRESHOLD` - ツール有効化の類似度閾値 (デフォルト: 0.5)
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `NOTION_API_KEY` / `NOTION_DATABASE_ID`

## コーディング規約

- 英語でコメント・ドキュメントを書く
- TypeScriptの型を適切に定義する
- Next.js App Routerのパターンに従う
- Server ComponentsとClient Componentsを適切に使い分ける
