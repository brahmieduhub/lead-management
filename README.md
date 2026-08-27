# EduTestPro — JEE/NEET Performance & AI Diagnostics Platform

Zero-to-low-cost academic performance tracking and AI diagnostic platform for JEE/NEET coaching centers.

## Features

- **Standardized metrics** — percentile, z-score, campus rank computed per assessment (difficulty-independent)
- **Longitudinal analytics** — 3/5-window rolling averages, velocity tracking per student
- **Drift detection** — auto-classifies students as `IMPROVED_SIGNIFICANTLY`, `DEGRADED_SIGNIFICANTLY`, `STABLE`, `CONSISTENT_TOPPER` (Δ percentile ≥ ±15)
- **Top-15 cohort tracking** — per-assessment snapshots with rank-stability data
- **Faculty difficulty tagging** — EASY / MODERATE / DIFFICULT / JUST_RIGHT per subject per test
- **AI Diagnostics** — Gemini 1.5 Flash generates summary, strong/weak subjects, and a 7-day revision plan (deterministic template fallback when no API key)
- **XLS Data Import** — upload students or results via `.xlsx`/`.xls`
- **Metabase reporting** — Dockerized BI dashboards connected to the same database

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| DB | SQLite (dev) / NeonDB Postgres (prod) via Prisma |
| Auth | Custom HMAC-signed cookie session (role: ADMIN, FACULTY, CAMPUS_HEAD, TELE_CALLER) |
| AI | Gemini 1.5 Flash (`@google/generative-ai`) + template fallback |
| BI | Metabase (Docker) |
| Charts | Tailwind CSS (UI only) |

## Quick Start

```bash
# 1. Install
npm install

# 2. Setup DB (SQLite)
npx prisma generate; npx prisma db push

# 3. Seed demo data (3 campuses, 12 batches, 360 students, 72 assessments)
npx tsx prisma/seed.ts

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

### Demo Login
- **Super Admin:** `superadmin@eduhub.com` / `password123`
- **Campus Admin:** `admin@delhincr.com` / `password123` (also `hyderabad`, `pune`)
- **Faculty:** `faculty@delhincr.com` / `password123`
- **Telecaller:** `tele@delhincr.com` / `password123`

## Gemini AI Setup (Optional)

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/)
2. Set in `.env`:
   ```
   GEMINI_API_KEY="your-key-here"
   ```
3. If no key is set or the API call fails, the platform automatically falls back to a deterministic template-based diagnostic generator (so demos never break).

## Metabase Reporting

Metabase connects to the same SQLite database for ad-hoc reporting and shared dashboards.

```bash
docker compose up -d
# → http://localhost:3001
```

First-time setup wizard:
1. Create an admin account (any email)
2. **Add Database** → SQLite
   - File path: `/data/dev.db` (mounted from `./prisma/dev.db`)
3. Build dashboards: batch-wise score distributions, drift flags, top-15 heatmaps, KPI cards.

For Postgres (NeonDB) in production, replace the datasource URL in `prisma/schema.prisma` and change the Metabase connection to Postgres connection string.

## XLS Upload

Visit **Upload XLS** in the sidebar:

- **Students** — columns: `rollNo`, `name`, `email` (opt), `phone` (opt)
- **Results** — columns: `rollNo`, `marks`, `maxMarks` (opt), auto-creates an assessment
  - Percentile/z-score/campus rank are computed for the whole upload batch automatically

## Project Structure

```
prisma/schema.prisma   # Full domain model (students, assessments, results, trends, diagnostics)
src/lib/analytics.ts   # Standardization, drift classification, rolling averages
src/lib/ai.ts          # Gemini payload builder + prompt + fallback logic
src/app/
  page.tsx                 # Dashboard (KPIs, improvers, recent results)
  students/                # List + student detail (trajectory + AI report)
  assessments/             # Test list + detail w/ difficulty tags
  cohort/                  # Drift flags + Top-15 tracker
  upload/                  # XLS import UI
  settings/                # Campuses, batches, users
  api/ai/diagnose          # Gemini + fallback
  api/auth/login,logout    # Session create/clear
  api/upload               # XLSX/CSV import
docker-compose.yml     # Metabase BI container
```

## Cost Model (Phase 1)

| Item | Cost |
|---|---|
| Next.js compute | Free (Vercel/Cloudflare Workers free tier; scale-to-zero) |
| SQLite / Postgres | Free (SQLite local, or Neon free tier) |
| Gemini 1.5 Flash | Free tier (60 req/min) — manual per-student generation |
| Metabase | Free OSS, self-hosted |
| **Total** | **$0/month** |

## Roadmap (Phase 2)

- pgvector embeddings on question-level responses → auto-suggest practice questions
- Scheduled Node.js JSON/Parquet exports to R2/GCS for historical archival
- Multi-role granular permissions (campus-scoped data visibility)
- Batch AI generation with rate-limit/cost counter