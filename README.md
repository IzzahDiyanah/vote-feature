# Feature Request & Voting Platform

> **Work in progress.** The backend is built and tested. The Next.js frontend, the web
> Docker service, and the full architecture notes are still to come. This README will be
> expanded when they land.

A product-feedback app: users submit feature requests, vote, comment and follow progress;
admins change status, add an official response, merge duplicates and see usage stats.

## Prerequisites (macOS)

- Node.js 20 or newer (`node -v`)
- Docker Desktop (`docker --version`)
- Git

## Run the backend

```bash
# 1. Environment (no secrets are committed; set your own JWT_SECRET)
cp .env.example .env
cp api/.env.example api/.env        # edit JWT_SECRET in both files (16+ characters)

# 2. Start Postgres (this also creates the separate test database)
docker compose up -d db

# 3. Install, migrate, seed, run
cd api
npm install
npx prisma migrate dev              # should report the database is already in sync
npm run db:seed                     # demo users + sample requests
npm run start:dev                   # API on http://localhost:3001
```

Check it: `curl http://localhost:3001/health` returns `{"status":"ok"}`.

Demo logins (local only), all with password `Password123!`:
`admin@example.com` (admin), `alice@example.com`, `bob@example.com`.

Or run the API in Docker too: `docker compose up --build` (needs `.env` in the repo root).

## Run the tests

The tests use a real Postgres database (`featurevote_test`), not mocks.

```bash
docker compose up -d db
cd api
npm test
```

## What the tests cover

| Rule | Where |
|---|---|
| One vote per user, even under 25 parallel identical requests | `test/votes.spec.ts` |
| Parallel votes from many users give the exact total | `test/votes.spec.ts` |
| Repeated PUT / DELETE are harmless (idempotent) | `test/votes.spec.ts` |
| Database itself refuses a duplicate vote | `test/votes.spec.ts` |
| Only admins can change status, respond, merge, see stats | `test/admin.spec.ts` |
| A user cannot edit another user's request | `test/requests.spec.ts` |
| Merge keeps all votes and comments; double voters counted once | `test/merge.spec.ts` |
| A failed merge rolls back completely | `test/merge.spec.ts` |
| Votes racing a merge are never lost or stranded | `test/merge.spec.ts` |
| Auth: cookie flags, bad login, validation errors | `test/auth.spec.ts` |

## API overview

| Method | Path | Who |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | public |
| GET | `/auth/me` | logged in |
| GET, POST | `/requests` (search, filter, sort, paging) | logged in |
| GET, PATCH | `/requests/:id` (PATCH: author only) | logged in |
| PUT, DELETE | `/requests/:id/vote` | logged in |
| GET, POST | `/requests/:id/comments` | logged in |
| PATCH | `/admin/requests/:id/status` | admin |
| PUT | `/admin/requests/:id/response` | admin |
| POST | `/admin/requests/:id/merge` | admin |
| GET | `/admin/stats` | admin |

Errors always look like `{ "error": { "code": "...", "message": "...", "details": [...] } }`.

## Status of the work

| Area | State |
|---|---|
| Database schema and migration | Done |
| Auth, roles, guards | Done |
| Requests, voting, comments | Done |
| Admin: status, response, stats, merge | Done |
| Backend tests (51) | Done |
| Next.js frontend | Not started |
| Web Docker service | Not started |
| Architecture notes, trade-offs, limitations | Not started |
