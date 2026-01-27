# Architecture

## Data Flow

```mermaid
flowchart LR
  User[User] -->|Question| UI[Next.js UI]
  UI -->|POST /api/chat| API[Chat API]
  API -->|Fetch history| DB[(Supabase Postgres)]
  API -->|Retrieve embeddings| RAG[Supabase RPC match_documents]
  API -->|Prompt + Context| LLM[OpenAI GPT-4o-mini]
  LLM -->|Answer| API
  API -->|Store chat logs| DB
  API -->|Stream response| UI
  UI -->|Render answer| User
```

## Services Overview

```mermaid
flowchart TB
  subgraph Client
    Browser[Browser]
  end

  subgraph App
    NextJS[Next.js App Router]
    API[API Routes]
  end

  subgraph Data
    Supabase[(Supabase\nPostgres + pgvector)]
    Notion[Notion API]
  end

  subgraph AI
    OpenAI[OpenAI API]
  end

  Browser --> NextJS
  NextJS --> API
  API --> Supabase
  API --> OpenAI
  Notion -->|ETL ingest| Supabase
```

## Local Data Flow

```mermaid
flowchart LR
  User[User] -->|Browser| UI[Next.js<br/>localhost:3000]
  UI -->|/api/chat| API[Next.js API Routes]
  API -->|SQL + RPC| DB[(Supabase Local Postgres)]
  API -->|Auth| Auth[Supabase Auth<br/>local]
  API -->|LLM request| LLM[OpenAI API]
  Notion[Notion API] -->|npm run ingest:notion| Ingest[ETL script]
  Ingest -->|Embeddings + Docs| DB
  Auth -->|Magic Link| Mailpit[Mailpit<br/>localhost:54324]
  API -->|Logs| DB
  DB -->|History + Context| API
  API -->|Stream| UI
```

Notes:
- During local validation, the Supabase containers stay running while you test.
- Local Studio is at http://127.0.0.1:54323 and Mailpit at http://127.0.0.1:54324.

## Repository Notes

- `scripts/ingest-notion.ts` ingests Notion pages into `documents` with embeddings.
- `supabase/schema.sql` defines `documents`, `chat_logs`, and `chat_sessions`.
- `src/app/api/chat/route.ts` logs conversations and rebuilds history per `chat_id`.
- `src/app/api/chat/logs/route.ts` returns chat logs for a session.
- `src/app/api/chat/sessions/route.ts` lists available chat sessions.
