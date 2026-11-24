# Vote: Feature Request & Voting Platform

> **Work in progress.** The backend and frontend are built and tested. The architecture
> notes (decisions, rejected alternatives, limitations, next steps) are still to be written.

Users submit feature requests, vote, comment and follow progress. Admins change status,
add an official response, merge duplicates and see usage stats.

## Prerequisites (macOS)

- Node.js 20 or newer (`node -v`)
- Docker Desktop (`docker --version`)
- Git

## Quick start: everything in Docker

```bash
cp .env.example .env            # then set JWT_SECRET to a long random string
docker compose up --build       # db + api + web
docker compose exec api npm run db:seed    # demo users and sample requests (once)
```

Open <http://localhost:3000>. API: <http://localhost:3001> (`/health` should say `ok`).

Demo logins (local only), all with password `Password123!`:
`admin@example.com` (admin), `alice@example.com`, `john@example.com`.

## Development mode (hot reload)

```bash
# 1. Environment
cp .env.example .env
cp api/.env.example api/.env    # set JWT_SECRET (16+ characters) in both files
cp web/.env.example web/.env.local

# 2. Database
docker compose up -d db         # also creates the separate test database

# 3. API (http://localhost:3001)
cd api
npm install
npx prisma migrate dev          # should say the database is already in sync
npm run db:seed
npm run start:dev

# 4. Web (http://localhost:3000), in a second terminal
cd web
npm install
npm run dev
```

## Run the tests

```bash
docker compose up -d db
cd api && npm test              # 52 backend tests against a real Postgres
cd ../web && npm test           # 12 frontend tests
```

## What the tests cover

| Rule | Where |
|---|---|
| One vote per user, even under 25 parallel identical requests | `api/test/votes.spec.ts` |
| Parallel votes from many users give the exact total | `api/test/votes.spec.ts` |
| Repeated PUT / DELETE are harmless (idempotent) | `api/test/votes.spec.ts` |
| Database itself refuses a duplicate vote | `api/test/votes.spec.ts` |
| Only admins can change status, respond, merge, see stats | `api/test/admin.spec.ts` |
| A user cannot edit another user's request | `api/test/requests.spec.ts` |
| Merge keeps all votes and comments; double voters counted once | `api/test/merge.spec.ts` |
| A failed merge rolls back completely | `api/test/merge.spec.ts` |
| Votes racing a merge are never lost or stranded | `api/test/merge.spec.ts` |
| Bad merge input is rejected before it reaches the database | `api/test/merge.spec.ts` |
| Auth: cookie flags, bad login, validation errors | `api/test/auth.spec.ts` |
| Optimistic vote shows at once, rolls back on failure, cannot be double-clicked | `web/test/vote.test.tsx` |
| API errors become clear messages | `web/test/api.test.ts` |

## How it is built

```
api/   NestJS + Prisma + PostgreSQL     (REST API, auth, business rules)
web/   Next.js (App Router) + TanStack Query + Tailwind
docker-compose.yml                       (db, api, web)
```

- **Auth:** the login token is in an `httpOnly`, `SameSite=Lax` cookie, so page scripts cannot read it.
  Roles are checked on the server for every request.
- **Votes:** a unique index on `(userId, requestId)` is the real guard. Totals are counted from rows, never stored.
- **Merge:** one transaction with row locks, so votes and comments can never be lost or land on a request that is being merged.
- **Frontend state:** server data lives in TanStack Query. Search, filter, sort and page live in the URL.
  Votes update instantly and roll back if the server says no.
- **Accessibility:** labelled fields, visible keyboard focus, skip link, `aria-live` messages,
  status shown as words and shapes (never colour alone), reduced motion respected.

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
| Backend tests (52) | Done |
| Frontend: auth, list, filters, detail, create/edit, comments | Done |
| Frontend: admin panel, merge dialog, stats | Done |
| Frontend tests (12) and browser check of the main flows | Done |
| Docker: db, api, web | Written, needs a first run on your machine |
| Architecture notes, trade-offs, limitations | Not started |
