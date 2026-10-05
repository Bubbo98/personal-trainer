# Archived scripts

One-off schema migrations and data fixes that were **already applied** to the
production database, kept for history. They were written against the old
database helpers (`createDatabase()` callbacks, `sqlite3`) that the backend no
longer has: do not run them again.

New migrations live in `scripts/migrations/` (numbered, idempotent, JSON backup
first, try them on `database/prod-copy.db` before production).
