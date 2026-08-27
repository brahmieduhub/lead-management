# EduTestPro — Requirements

## 1. Functional Requirements

### 1.1 Single Student Journey & Trajectory Tracking

- **Score Standardization:** Track absolute marks (`total_marks`, percentage) alongside relative metrics (`percentile`, `z_score`, `campus_rank`, `overall_rank`) to evaluate performance independent of test difficulty.
- **Longitudinal Analytics:** Calculate rolling averages across 3–5 test windows to monitor velocity and subject-wise score trends over time.

### 1.2 Cohort Analysis & Drift Detection

- **Performance Drift Flags:** Automatically classify students into status buckets (`IMPROVED_SIGNIFICANTLY`, `DEGRADED_SIGNIFICANTLY`, `STABLE`, `CONSISTENT_TOPPER`) based on customizable percentile and score delta thresholds (Δ ≥ ±15%).
- **Top-Cohort Tracking:** Index and isolate Top 15 students across test cycles to evaluate ranking stability and subject volatility.

### 1.3 Faculty Test & Subject Calibration

- **Perceived Difficulty Matrix:** Enable faculty to tag subject difficulty per test (`EASY`, `MODERATE`, `DIFFICULT`, `JUST_RIGHT`) to contextualize score variations.

### 1.4 AI Diagnostic Engine

- **Automated Feedback Generation:** Utilize **Gemini 1.5 Flash API** to generate plain-text diagnostic summaries, strong/weak subject insights, and actionable 7-day revision plans based on performance data and faculty tags.

## 2. Non-Functional Requirements

### 2.1 Cost Optimization

- **Spend Target:** $0.00 to <$25/month operational spend.
- **Compute:** Free-tier cloud providers (Vercel, Cloudflare Workers, self-hosted Node.js).
- **Database:** SQLite (local dev) / NeonDB free tier (prod).
- **AI:** Gemini 1.5 Flash free-tier allowances; deterministic template fallback if key absent.

### 2.2 Scalability

- **Schema:** Optimized for 40–50 internal telecallers/coaches and tens of thousands of student records.
- **Indexing:** Prisma indexes on `studentId+assessmentId`, `batchId+assessmentId`, `assessmentId+campusId`.
- **Performance:** 3-window / 5-window rolling averages computed in-memory; drift flags evaluated per student per new assessment.

### 2.3 Phase 2 Expansion

- **pgvector** on `SubjectScore` embeddings → KNN auto-suggest practice questions.
- Scheduled Node.js JSON/Parquet export jobs to R2/GCS for historical archival.
- Multi-tenant `campusId` filter in every query for campus-scoped data visibility.
- Batch AI generation with per-student cost counter + rate-limit guard.

## 3. Database Entity Model (Prisma Schema Highlights)

| Model | Key Fields | Relations |
|---|---|---|
| `User` | `id`, `email` (unique), `name`, `passwordHash`, `role` (ADMIN/FACULTY/CAMPUS_HEAD/TELE_CALLER), `campusId?` | `belongsTo Campus`; `hasMany Batch`, `hasMany Student` |
| `Campus` | `id`, `name`, `city`, `state` | `hasMany Batch`, `hasMany User`, `hasMany CampusRankSummary` |
| `Batch` | `id`, `name`, `stream` (JEE/NEET), `sessionYear`, `campusId` | `belongsTo Campus`; `hasMany Student`, `hasMany Assessment` |
| `Student` | `id`, `rollNo` (unique), `name`, `email?`, `phone?`, `active`, `batchId` | `belongsTo Batch`; `hasMany TestResult`, `hasMany PerformanceTrend`, `hasMany DiagnosticReport` |
| `Assessment` | `id`, `title`, `batchId`, `examDate`, `totalMarks`, `status` (DRAFT/PUBLISHED/RESULTS_LOCKED), `subjectDifficulties?` | `belongsTo Batch`; `hasMany TestResult`, `hasMany SubjectDifficulty`, `hasMany CampusRankSummary`, `hasMany DiagnosticReport` |
| `TestResult` | `id`, `assessmentId`, `studentId`, `totalMarks`, `percentage`, `percentile?`, `zScore?`, `campusRank?`, `overallRank?`, `present`, `rawJson?`, `subjectScores` | `belongsTo Assessment`, `belongsTo Student`; `hasMany SubjectScore` |
| `SubjectScore` | `id`, `testResultId`, `subject`, `marks`, `maxMarks`, `percentile?`, `zScore?` | `belongsTo TestResult` |
| `PerformanceTrend` | `id`, `studentId`, `assessmentId`, `rollingAvg3?`, `rollingAvg5?`, `velocity?`, `driftStatus`, `statusFrom?`, `statusTo?` | `belongsTo Student`, `belongsTo Assessment` |
| `CampusRankSummary` | `id`, `assessmentId`, `campusId`, `top15Json`, `generatedAt` | `belongsTo Assessment`, `belongsTo Campus` |
| `DiagnosticReport` | `id`, `studentId`, `assessmentId?`, `summary`, `strongSubjects` (Json), `weakSubjects` (Json), `revisionPlan`, `model` (default: gemini-1.5-flash), `fallbackUsed` (default: false), `createdAt` | `belongsTo Student`, `belongsTo Assessment?` (nullable) |

## 4. API Specification

| Endpoint | Method | Auth | Body | Response |
|---|---|---|---|---|
| `/api/auth/login` | POST | None | `{ email, password }` | `{ ok, user, token }` |
| `/api/auth/logout` | POST | None | — | `{ ok }` |
| `/api/ai/diagnose` | POST | Session cookie | `{ studentId }` | `{ report: { summary, strongSubjects, weakSubjects, revisionPlan, fallbackUsed, model, createdAt } }` |
| `/api/upload` | POST | None | `multipart/form-data`: `file` (.xlsx/.xls), `uploadType` ("students"|"results"), optional `assessmentJson` | `{ imported, skipped, message }` |

## 5. User Stories (Phase 1)

- **Super Admin:** Can manage campuses, batches, users; view dashboard KPIs; generate AI reports for any student.
- **Campus Admin:** Same as Super Admin but scoped to their campus only.
- **Faculty:** Can tag subject difficulty per test; can view class-level drift flags.
- **Telecaller:** Can upload XLS files (students or results); can view student trajectory on detail page.
- **Student/Parent:** Can view their own trajectory and AI diagnostic report (if enabled).

## 6. Deployment Checklist

- [ ] Run `npm install`
- [ ] Run `npx prisma generate; npx prisma db push` (SQLite dev; Postgres prod)
- [ ] Run `npx tsx prisma/seed.ts` (populates demo data)
- [ ] Set `GEMINI_API_KEY` in `.env` (optional; fallback works without it)
- [ ] Run `docker compose up -d` (starts Metabase at http://localhost:3001)
- [ ] Run `npm run dev` → access at http://localhost:3000
- [ ] Log in with `superadmin@eduhub.com` / `password123`
- [ ] Explore: Dashboard → Students → Assessments → Cohort → Upload → Settings

## 7. Cost Controls (PRD §5)

| Item | Target |
|---|---|
| Operational spend | $0.00 – <$25/month |
| Compute tier | Free-tier cloud / self-hosted Node.js |
| Database | SQLite local / NeonDB free tier |
| AI API calls | Manual per-student; Gemini free tier 60 req/min |
| BI tool | OSS Metabase Docker |
| **Total** | **$0/month** |

</final_file_content>

IMPORTANT: For any future changes to this file, use the final_file_content shown above as your reference. This content reflects the current state of the file, including any auto-formatting (e.g., if you used single quotes but the formatter converted them to double quotes). Always base your SEARCH/REPLACE operations on this final version to ensure accuracy.

</write_to_file>