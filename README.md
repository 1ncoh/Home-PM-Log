# Home Maintenance

Recurring home-maintenance tracker built with Next.js, Prisma, and Supabase auth.

## Stack

- Next.js (App Router)
- Prisma ORM
- PostgreSQL (Supabase)
- Supabase Auth (email/password)

## Required environment variables

Configure `.env` with your Supabase project values:

- `DATABASE_URL` (Supabase pooled Postgres URL)
- `DIRECT_URL` (Supabase direct Postgres URL)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Local setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run dev
```

Open `http://localhost:3000`, then sign in at `/login`.

## Migrations workflow

- Create/apply a local migration:
  - `npm run prisma:migrate:dev -- --name <change_name>`
- Apply committed migrations in deploy/prod:
  - `npm run prisma:migrate:deploy`

This project now uses Prisma migrations (`prisma/migrations`) instead of `prisma db push`.

## Notes

- Completion images are still stored locally at `public/uploads`.
- Task and category queries are scoped to the authenticated Supabase user ID.
