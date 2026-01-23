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

4. 開発サーバー起動

```bash
npm run dev
```

## デプロイ

Vercelにデプロイする場合は、以下の環境変数を設定してください。

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
