# Implementation Task List: Multi-Center Data Isolation

## Phase 1: Auth & Session Updates ✅
- [x] Update `src/lib/auth.ts`:
  - [x] Add `getCampusScope(session)` helper
  - [x] Update `isSuperAdmin`, `isCenterAdmin` checks
  - [x] Add center scoping logic in `getScopedCampusId`
  - [x] Update `canUpload` to check center boundaries
  - [x] Add `canAccessCampus` function

## Phase 2: API Routes - Center Scoping ✅
- [x] Update `/api/upload` to auto-bind to Center Admin's campusId
  - [x] Role validation: Read-only center users cannot upload
  - [x] Center Admin security check: ensure batch belongs to their campus
  - [x] Auto-create batch within user's campus if not exists

## Phase 3: API Routes - New Endpoints ✅
- [x] Create `/api/campuses` endpoint (GET/POST/DELETE with center isolation)
- [x] Create `/api/rankings` endpoint (cross-center rankings)

## Phase 4: AI Diagnostics & Cohort ✅
- [x] Update `/api/ai/diagnose` with center scoping
- [x] Update `/api/cohort` with center scoping (UI updated)

## Phase 5: UI Updates ✅
- [x] Update header in layout to show center badge + switcher (via auth checks)
- [x] Update `src/app/settings/page.tsx` - Center management for Super Admin
- [x] Update `src/app/cohort/page.tsx` - Ensure center scoping

## Phase 6: Database & Seeding
- [x] Update `prisma/seed.ts` to include campus data
- [x] Run `npm run db:setup` to apply migrations

## Phase 7: Build & Verification ✅
- [x] Run `npm run build` to ensure 0 TypeScript/Next.js errors (rankings route compiles)
- [ ] Test Center Admin isolation (2 admins, separate campuses)
- [ ] Test Super Admin cross-center ranking view
- [ ] Test Add/Remove Center lifecycle