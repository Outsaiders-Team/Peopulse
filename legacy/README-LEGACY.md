# Legacy Peopulse (pre-Next.js)

This folder is the archived static HTML/JS frontend + FastAPI/Python backend that Peopulse
ran on before the migration to Next.js. It is kept **for behavior reference and rollback
only** — it is not deployed and nothing in the Next app imports or serves from here.

The canonical, supported app is the Next.js app at the **repo root**. See the root
[`README.md`](../README.md) for the current local run / deploy instructions.

## What's here

- `frontend/` — the original static UI (vanilla HTML/CSS/JS, component fragments loaded at runtime)
- `backend/` — the original FastAPI service (column detection, LLM analysis, prompts)
- `run` — the old one-shot script that started both together
- `vercel.json` — the old static-site rewrite config for deploying `frontend/` from the repo root

## How this used to run (reference only)

```bash
cd legacy/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add OPENROUTER_API_KEY
cd ../..

./legacy/run
```

- UI → http://127.0.0.1:3456
- API → http://127.0.0.1:8000

Do not wire this into Vercel or any other host — it is superseded by the Next.js app.
