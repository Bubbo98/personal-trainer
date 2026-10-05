# Backend — EserciziFacili

Node.js + Express API for the client dashboard and the admin area. Deployed on
Vercel as one serverless function (`server.js`), database on Turso (libsql/SQLite),
files on Cloudflare R2, emails with Resend.

## Run locally

```bash
cd backend
npm install
cp .env.example .env   # fill it in (see the comments)
npm run dev            # http://localhost:3001, frontend on :3000
```

> `backend/.env` usually points at the **production** Turso database: what you do
> locally changes real data. Use the Test User (id 165) for experiments.

## Structure

| Path | What |
| --- | --- |
| `server.js` | Express app: middleware, routes, 404 and error handler |
| `config.js` | every environment variable, read once |
| `middleware/auth.js` | session tokens, admin check, active-user check |
| `routes/` | HTTP layer, one file per area (`admin/` split by topic) |
| `services/` | logic shared by routes: training days, video access, exercise ↔ video links, plan PDF parser, check-in rule, stored files, emails |
| `utils/database.js` | single libsql client: `db.query/get/run/batch/transaction` |
| `utils/http.js` | `route()` async wrapper, `HttpError` helpers, `id()`, error handler |
| `utils/r2.js` | R2 client: signed URLs, uploads, objects |
| `utils/userRetention.js` | plan-expiry access block and nightly user cleanup |
| `scripts/` | snapshot of production, migrations, file move, reminders job (`archive/`: old one-offs, already applied) |
| `test/` | API tests |

Errors always come back as `{ success: false, error, code? }`.

## Tests

```bash
node scripts/snapshot-prod-db.js   # copy production into database/prod-copy.db (+ R2 files in database/prod-files)
npm test
```

The tests boot the real app on a throwaway copy of the snapshot: production is
never touched, emails are off, R2 is faked in memory. `database/` is git-ignored
(it holds real client data).

## Database migrations

`scripts/migrations/NNN-*.js`, idempotent, each exporting `migrate(client)`.

```bash
node scripts/migrations/004-something.js --db file:database/prod-copy.db   # try on the copy
node scripts/migrations/004-something.js --apply                            # production
```

Run schema migrations **before** deploying code that needs them. The tests apply
every migration to their copy automatically.

## Deploy

Pushing `master` deploys frontend and backend on Vercel. Check that the new code
is live with `GET /api/health`: `version` is the deployed commit.
Before pushing, the production build must pass: `CI=true npx react-scripts build`
in the project root (TypeScript errors fail it).

Cron jobs (`vercel.json`): `/api/cron/send-reminders` (daily check-in reminders)
and `/api/cron/cleanup-users` (deletes expired and deactivated clients;
`?dryRun=1` only lists them).
