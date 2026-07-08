# GrowEasy AI CSV Importer

An AI-powered CSV importer built for the GrowEasy Software Developer assignment.
Upload a CSV in **any layout** (Facebook Lead Ads export, Google Ads export, a
messy Excel sheet, a manually made spreadsheet — anything), and the app uses
an AI model (via [Groq](https://groq.com), free tier) to intelligently map the
columns into GrowEasy's fixed CRM lead format.

## How it works (high level)

```
1. User uploads a CSV               → handled entirely in the browser
2. Browser parses & shows a preview → no AI call yet (Step 2 of the spec)
3. User clicks "Confirm Import"     → file is sent to the backend
4. Backend parses the CSV again (server-side, for safety)
5. Backend splits rows into small batches (default: 15 rows per batch)
6. Each batch is sent to Groq with a detailed system prompt describing
   the CRM fields, allowed enum values, and edge-case rules
7. Backend re-validates every single field the AI returns
   (never trusts the AI blindly — this is the important part!)
8. Backend returns { imported, skipped, totalImported, totalSkipped }
9. Frontend displays the results in a table
```

## Project structure

```
groweasy-csv-importer/
├── backend/              Express + TypeScript API (does the AI mapping)
│   └── src/
│       ├── server.ts             Express app entry point
│       ├── routes/                API route definitions
│       ├── controllers/           Orchestrates one import request
│       ├── services/
│       │   ├── csvService.ts      Parses CSV text, splits into batches
│       │   ├── groqService.ts     Talks to Groq's AI API (the prompt lives here)
│       │   └── validationService.ts  Double-checks everything the AI returns
│       ├── types/                 Shared TypeScript interfaces
│       └── config/                Constants (allowed enum values, etc.)
│
└── frontend/              Next.js + TypeScript + Tailwind CSS
    ├── pages/
    │   ├── _app.tsx               Loads global styles
    │   └── index.tsx              The entire 4-step UI flow lives here
    ├── components/
    │   ├── UploadBox.tsx          Drag & drop / file picker
    │   ├── PreviewTable.tsx       Raw CSV preview (Step 2)
    │   ├── ResultsTable.tsx       AI-mapped results (Step 4)
    │   └── Loader.tsx             Loading spinner
    └── lib/
        ├── api.ts                 Calls the backend's /api/import endpoint
        └── types.ts               Shared TypeScript interfaces
```

Why two separate folders instead of one Next.js app? The assignment
specifically asks for a Node.js/Express backend and a Next.js frontend as two
distinct pieces, so the code is structured to match that exactly.

## Prerequisites

- Node.js 18 or newer (needed for the built-in `fetch` used in the backend)
- A free Groq API key from https://console.groq.com/keys

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in your real Groq API key:

```
GROQ_API_KEY=your_real_key_here
GROQ_MODEL=llama-3.3-70b-versatile
PORT=5000
FRONTEND_URL=http://localhost:3000
BATCH_SIZE=15
```

Run it in development mode:

```bash
npm run dev
```

The backend will start at `http://localhost:5000`. Visiting that URL in a
browser should show `{"status":"ok", ...}`.

For a production build:

```bash
npm run build
npm start
```

## 2. Frontend setup

Open a **second terminal** (keep the backend running):

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

`.env.local` should point at your backend:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Run it in development mode:

```bash
npm run dev
```

Visit `http://localhost:3000` and try uploading a CSV.

## The AI prompt design (evaluation criteria: prompt engineering)

The full prompt lives in `backend/src/services/groqService.ts`, in the
`buildSystemPrompt()` function. The key design decisions:

- **Every row is tagged with its original index** before being sent to the
  AI, and the AI is instructed to return that same index. This means even if
  the AI reorders or drops a row, we can always match results back to the
  correct original row (or notice it's missing and skip it safely).
- **The allowed enum values for `crm_status` and `data_source` are spelled
  out explicitly** in the prompt, with an instruction to leave the field
  blank rather than guess when unsure.
- **`temperature: 0`** is used so the AI behaves as consistently and
  deterministically as possible — this is a data-extraction task, not a
  creative one.
- **`response_format: { type: "json_object" }`** is used so Groq guarantees
  syntactically valid JSON back, instead of us having to parse loose text.
- **Batching**: rows are sent in small batches (default 15) instead of one
  huge request. This keeps each AI call fast, keeps us well within Groq's
  free-tier rate/token limits, and means a single bad batch doesn't lose the
  whole file.
- **Retry logic**: `groqService.ts` has `mapBatchWithRetry()`, which retries
  a failed batch once before giving up. Rows in a batch that still fails end
  up in the "skipped" list rather than crashing the whole import.
- **We never trust the AI's output blindly.** After the AI responds,
  `validationService.ts` independently re-checks every field:
  - `crm_status` / `data_source` are forced back to `""` if the AI didn't
    return one of the exact allowed values.
  - `created_at` is only kept if `new Date(value)` actually parses it.
  - Any row missing **both** an email and a mobile number is moved to the
    skipped list — this rule is enforced in our own code, not left up to
    the AI to remember.

## Deployment

**Frontend (Vercel is easiest):**
1. Push this repo to GitHub.
2. Import the `frontend` folder as a new Vercel project (set the project
   root directory to `frontend`).
3. Add the environment variable `NEXT_PUBLIC_BACKEND_URL` pointing at your
   deployed backend URL.

**Backend (Render or Railway are easiest for a free Express API):**
1. Create a new Web Service from the same GitHub repo, root directory
   `backend`.
2. Build command: `npm install && npm run build`
3. Start command: `npm start`
4. Add the environment variables from `.env.example` (`GROQ_API_KEY`,
   `GROQ_MODEL`, `FRONTEND_URL`, `BATCH_SIZE`) — set `FRONTEND_URL` to your
   deployed Vercel URL so CORS allows it.

## Notes / known limitations

- This project is intentionally kept dependency-light and beginner-simple:
  no state-management libraries, no ORMs, no database — it's stateless by
  design, as the assignment allows.
- Large CSVs (thousands of rows) will take longer because batches are sent
  to Groq one at a time, sequentially, to stay safely within free-tier rate
  limits. This trades a bit of speed for reliability.
