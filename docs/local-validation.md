# ローカル検証の手順

このドキュメントは、ローカル環境でアプリ全体を通しで動作確認する手順です。

## 前提
- Node.js / npm がインストール済み
- Supabase CLI が使える
- ローカルSupabaseを起動できる（Rancher Desktop利用時は別途対処済み）

## 手順

1. ローカルSupabaseを起動する
   ```bash
   supabase start
   ```
   - 出力にある `Project URL` と `Publishable/Secret` を控える

2. スキーマを適用する
   - Studio で `supabase/schema.sql` を実行  
     Studio: http://127.0.0.1:54323
   - もしくは `psql` を使う
     ```bash
     psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
       -f supabase/schema.sql
     ```

3. 環境変数を設定する
   ```bash
   cp .env.example .env.local
   ```
   - `.env.local` の `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` をローカルSupabaseの値に置き換える
   - `OPENAI_API_KEY` は必要
   - Notion取り込みをするなら `NOTION_API_KEY`,
     `NOTION_DATABASE_ID` も設定する

4. 依存関係をインストールして起動する
   ```bash
   npm install
   npm run dev
   ```

## 動作確認

1. アプリにアクセス
   - http://localhost:3000

2. 認証
   - Magic link を使う場合: Mailpit を開く  
     Mailpit: http://127.0.0.1:54324
   - パスワード認証の場合は通常のサインインでOK

3. チャット
   - 1つ会話を作成し、返信が返ることを確認する

4. RAG（任意）
   - Notion 取り込み済みの場合、キーワードを含む質問で検索結果が
     返ることを確認する
   - 未取り込みの場合は `npm run ingest:notion` を実行する
