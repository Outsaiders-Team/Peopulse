# Peopulse

Upload a citizen feedback export (CSV/XLSX/XLS) and get back a short summary, the
big overall themes, and a per-question breakdown of what people said — split into
"heard often" and "also worth noting", each tagged positive or negative.

Peopulse is a single Next.js (App Router + TypeScript) app: the UI and the analysis
API (column detection, grouping, LLM call) both live in this app and deploy together
on Vercel.

## Local run

```bash
cp .env.example .env   # add OPENROUTER_API_KEY
npm install
npm run dev
```

Open http://localhost:3000. One process — no separate backend to run.

## How it works

1. `POST /api/upload-csv` (multipart, field `file`) parses the CSV/XLSX/XLS.
2. `lib/data-pipeline.ts` scores columns to find the feedback column(s), then groups
   non-empty responses by question.
3. `lib/llm.ts` sends the grouped feedback to an LLM over OpenRouter, using the system
   prompt in `prompts/llm_prompt.md`, with retries for transient failures and
   malformed JSON.
4. `lib/normalize.ts` shapes the model output into the `AnalysisResult` the UI renders
   (see `lib/types.ts` for the full contract).

## Project layout

```text
app/            Next.js App Router pages + API routes
components/     UI components (upload, output, toast, accordion)
lib/            Data pipeline, LLM client, normalization, shared types
public/assets/  Brand images
prompts/        LLM system prompt
legacy/         Archived pre-Next.js stack (reference only, not deployed)
```

## Deploy (Vercel)

- Set the `OPENROUTER_API_KEY` environment variable on the Vercel project.
- The `/api/upload-csv` route sets `maxDuration = 300` (the Hobby plan max) to give
  the LLM call and its retries enough time; raise it if you're on Pro/Enterprise.
- The browser always calls the same-origin `/api/upload-csv` — no separate API URL
  or CORS config needed.

## Previous stack

The pre-Next.js version (static HTML/JS frontend + FastAPI backend) is preserved under
[`legacy/`](legacy/README-LEGACY.md) for reference and rollback. It is not deployed and
the Next app does not import anything from it.
