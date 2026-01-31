NotionのデータをRAGで検索し、Vercel AI SDKで対話するNext.jsアプリです。

## セットアップ

1. 環境変数を設定

```bash
cp .env.example .env.local
```

2. Supabaseにスキーマを適用

`supabase/schema.sql` をSQLエディタで実行してください。

3. Notionを取り込み

```bash
npm run ingest:notion
```

`.env.local` を使う場合は以下のように実行します。

```bash
npm run ingest:notion -- .env.local
```

4. 開発サーバー起動

```bash
npm run dev
```

## デプロイ

Vercelにデプロイする場合は、以下の環境変数を設定してください。

- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL` (optional, default: `gpt-4o-mini`)
- `RAG_MIN_SIMILARITY` (optional, default: `0.25`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`

## ローカル検証

手順は [`docs/01-setup-local-validation.md`](./docs/01-setup-local-validation.md) を参照してください。



■ コメント
データ分析基盤では、Snowflakeのストアドプロシージャを実装し、
データ加工処理やバッチ処理のロジックを整理しました。
あわせて、Snowflake Taskを用いた定期実行設定を行い、
実行順序や依存関係を考慮したスケジュール設計を経験しました。  

セキュリティ要件を考慮した権限設定や運用を意識しつつ、
GitHub Copilotを活用してデータフロー作成や実装作業を効率化し、
スケジュールがタイトな中でもリリースまで対応しました。  

AWS構築は手動作業が中心でしたが、今後はCDK等によるIaC化を進める余地があると認識しています。

・既存移行システムの調査および影響範囲の整理
・新規分析基盤における基本設計／詳細設計
(テーブル定義作成、バッチ設計2本, 機能設計5本)
・AWS構成検討および実装方針の整理
　（Step Functions、ECS、EventBridge、Lambda、S3 等を用いたデータ処理基盤）
・機能開発～リリース対応 (API 10本ほど実装, リリース手順作成, )
・運用保守対応 (並行稼働運用, 障害リカバリ作業)