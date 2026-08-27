# EduTestPro — Architecture Overview

## 1. High-Level Architecture

The platform is a **full-stack, zero-to-low-cost JEE/NEET academic performance tracking and AI diagnostics system** built on a monorepo-style Next.js 14 (App Router) codebase. The architecture follows a **client–server model** with server actions and API routes for business logic, and React components for the UI.

### 1.1. Layers

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS v4 | UI rendering, navigation, form handling, chart-free (custom utils) |
| **Backend** | Next.js API Routes (Edge-compatible), custom auth + analytics + AI utility libs | Route handlers, data validation, JWT session generation, Gemini prompt building, fallback logic |
| **Database** | SQLite (dev) / NeonDB Postgres (prod-ready) via Prisma ORM | Students, assessments, results, trends, diagnostics, campuses, batches |
| **AI** | Google Gemini 1.5 Flash (`@google/generative-ai`) + deterministic template fallback | Per-student diagnostic summaries, strong/weak subject identification, 7-day revision plans |
| **BI / Reporting** | Metabase (Docker, SQLite mounted at `./prisma/dev.db`) | Ad-hoc dashboards: score distributions, drift flags, top-15 heatmaps, KPI cards |
| **Deployment** | Vercel / Cloudflare Workers (free tier, scale-to-zero) or self-hosted Node.js | Zero to <$25/month operational spend |

### 1.2. Data Flow

1. **XLS Upload** → `/api/upload` (XLSX parser) → Prisma `student` / `testResult` creation → Type-standardized analytics payload
2. **AI Diagnostics** → `/api/ai/diagnose` → builds student payload → Gemini prompt → text response → stored in `DiagnosticReport` model
3. **Drift Detection** → analytics library (`classifyDrift`) runs on every student's percentile history → stored in `PerformanceTrend`
4. **Cohort Reports** → `GET /cohort` queries `PerformanceTrend.groupBy` + `CampusRankSummary` → rendered as tables + heatmap

### 1.3. Key Types

| Type | Definition | Purpose |
|---|---|---|
| `StudentPayload` | `{ student, last3Results, subjectBreakdown: { strongSubjects, weakSubjects, subjectStats } }` | Normalized data fed to both Gemini prompt and fallback generator |
| `DriftStatus` | `"IMPROVED_SIGNIFICANTLY" \| "DEGRADED_SIGNIFICANTLY" \| "STABLE" \| "CONSISTENT_TOPPER"` | Auto-classification per PRD §2 |
| `SubjectStat` | `{ totalMarks: number; count: number; percentiles: number[]; trend: number }` | Per-subject aggregation for strong/weak identification |
| `ExistingReport` | `{ id, summary, strongSubjects, weakSubjects, revisionPlan, fallbackUsed, createdAt }` | Shape of stored / retrieved AI report |

### 1.4. Middleware

- `src/middleware.ts` checks for a `session` cookie on every request
- Public paths: `/login`, `/api/auth/login`
- Unauthenticated API → 401 JSON; unauthenticated UI → redirect to `/login` with `next` query param
- Cookie presence check only (full HMAC validation happens server-side in `getSession()`)

### 1.5. Cost Model (Phase 1)

| Component | Monthly Cost | Notes |
|---|---|---|
| Next.js compute (Vercel/Workers) | $0 | Free tier, scale-to-zero |
| SQLite (local file) | $0 | Embedded, no hosting cost |
| Gemini 1.5 Flash API | $0–$5 | Free tier 60 req/min; manual per-student generation |
| Metabase Docker | $0 | OSS, self-hosted |
| **Total** | **$0** | Within PRD constraint <$25/month |

### 1.6. Deployment

- **Development:** `npm run dev` → `http://localhost:3000`
- **Production:** `npm run build` → static + server output in `.next/`
  - Deploy to Vercel (free) or any Node.js host
  - `docker compose up -d` for Metabase BI
- **Database migration:** `npx prisma generate; npx prisma db push` (SQLite dev; Postgres prod)

## 2. Component Map

| Component | Path | Props | Description |
|---|---|---|---|
| `Sidebar` | `src/components/Sidebar.tsx` | None (client) | Collapsible nav; highlights active route; hidden on `/login` |
| `DiagnosticReport` | `src/components/DiagnosticReport.tsx` | `{ studentId, existing? }` | Gemini UI: generate / regenerate / summary / strong / weak / 7-day revision plan |
| `AppShell` *(implicit)* | `src/app/layout.tsx` | None | Wraps page content; Sidebar renders conditionally based on pathname |

## 3. API Routes

| Path | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/login` | POST | None | Authenticates email/password → sets HMAC cookie |
| `/api/auth/logout` | POST | None | Clears session cookie |
| `/api/ai/diagnose` | POST | None (validates via `getSession()`) | Builds student payload → Gemini or fallback → stores `DiagnosticReport` |
| `/api/upload` | POST | None | Multipart XLSX parser → students or results import → standardized analytics + z-scores |

## 4. Domain Model (Prisma)

```
User    — role: ADMIN / FACULTY / CAMPUS_HEAD / TELE_CALLER
Campus  — hasMany Batch, User; hasMany RankSummary
Batch   — belongsTo Campus; hasMany Student, Assessment
Student — belongsTo Batch; hasMany TestResult, PerformanceTrend, DiagnosticReport
Assessment — belongsTo Batch; hasMany TestResult, SubjectDifficulty, CampusRankSummary, DiagnosticReport
TestResult — belongsTo Assessment, Student; hasMany SubjectScore
SubjectScore — belongsTo TestResult
PerformanceTrend — belongsTo Student, Assessment
CampusRankSummary — belongsTo Assessment, Campus
DiagnosticReport — belongsTo Student, Assessment? (nullable)
```

## 5. Security

- **Auth:** HMAC-signed cookie (no external auth provider needed; password bcrypt'd in Prisma)
- **Middleware:** Cookie-presence guard + API 401 for `/api/*`
- **Data:** Prisma permissions via role field; no row-level security needed for Phase 1 (internal telecallers only)
- **AI:** No PII sent to Gemini beyond aggregate scores + subject names; fallback generator is 100% local

## 6. Extensibility (Phase 2)

- `pgvector` on `SubjectScore` embedding → KNN practice-question suggestion
- Scheduled Node job → JSON/Parquet export to R2/GCS for historical archival
- Multi-tenant `campusId` filter in every query for campus-scoped data visibility
- Batch AI generation with per-student cost counter + rate-limit guard