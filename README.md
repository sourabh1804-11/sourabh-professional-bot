# 🧠 AskSourabh — Personal RAG Chatbot

A production-grade, 6-layer context-engineered RAG chatbot that answers questions about Sourabh Singhal's professional background, powered by Gemini and Supabase pgvector.

## Architecture

This project implements a **6-layer context engineering engine**:

| Layer | Name | File | Role |
|-------|------|------|------|
| 1 | System Instructions | `lib/system-prompt.ts` | Persona, PII rules, conflict resolution |
| 2 | Security & Guardrails | `lib/security.ts` | Rate limiting, input validation, injection detection |
| 3 | Scope Management | `lib/scope.ts` | Gemini-powered intent classification |
| 4 | RAG Pipeline | `lib/rag.ts` | Embedding generation + pgvector similarity search |
| 5 | Synthesis & Compression | `lib/synthesize.ts` | Deduplication, trimming, U-shaped attention layout |
| 6 | Evaluation & Monitoring | `lib/logger.ts` | RAG Triad metrics + Supabase logging |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 + Framer Motion + shadcn/ui
- **AI SDK**: Vercel AI SDK
- **LLM & Embeddings**: Gemini API
- **Vector DB**: Supabase pgvector (HNSW index)
- **Rate Limiting**: Upstash Redis
- **Deployment**: Vercel

## Getting Started

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in the values
3. Run `npm install`
4. Run the Supabase migration (`supabase/migrations/001_create_documents.sql`)
5. Run the ingestion script: `npx tsx scripts/ingest.ts`
6. Start dev server: `npm run dev`

## Data Sources

All personal data is stored as curated Markdown files in the `data/` directory:
- `resume.md` — Work history, skills, certifications
- `portfolio.md` — Projects, milestones, achievements
- `linkedin.md` — Job descriptions, recommendations
- `github.md` — Repository summaries, contributions
- `blogs/` — Technical articles and essays

## Security

- **25 queries per user** per 24h (IP-based, Upstash Redis)
- **500 character input limit**
- **Prompt injection detection** (regex blocklist)
- **Strict PII blacklist** in system prompt (no salary, phone, address, keys)
- Quota exceeded → polite redirect to LinkedIn, Portfolio, Blog, Resume

## License

Private project.
