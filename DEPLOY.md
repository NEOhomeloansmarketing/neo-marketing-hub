# Deployment Guide — NEO Marketing Hub

## Prerequisites

- Supabase project (free tier works)
- Vercel account connected to GitHub
- `@neohomeloans.com` email for sign-up

---

## 1. Supabase Setup

### Create project
1. Go to [supabase.com](https://supabase.com) → New project
2. Note your **Project URL** and **anon key** (Settings → API)
3. Note your **service_role key** (Settings → API → Service role)
4. Note the **Direct connection string** (Settings → Database → Connection string → URI)
   - This is `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
5. Note the **Pooler connection string** (Supabase uses pgBouncer for `DATABASE_URL`)
   - Format: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`

### Restrict sign-ups (optional, recommended)
In Supabase → Authentication → Policies, you can add a trigger to check the email domain. The app also enforces this client-side.

---

## 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Database (Supabase connection strings)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Optional: AI action extraction
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Email
RESEND_API_KEY=re_...
```

---

## 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to Supabase (creates all tables)
npx prisma db push

# Seed with sample data
npx prisma db seed
```

Or use the npm scripts:
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

---

## 4. Local Development

```bash
npm install
npm run db:generate
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`.

Sign up at `/sign-in` with a `@neohomeloans.com` email.

After your first sign-up, add yourself to the `User` table via Prisma Studio:
```bash
npm run db:studio
```
Or update the seed script with your email.

---

## 5. Vercel Deployment

### Connect repository
1. Push this repo to GitHub
2. Import to Vercel: [vercel.com/new](https://vercel.com/new)
3. Framework: **Next.js** (auto-detected)

### Environment variables in Vercel
Add all variables from `.env.local` in Vercel → Settings → Environment Variables.

### Build command
Vercel will use `vercel.json`:
```
npx prisma generate && next build
```
This generates the Prisma client before building.

### Deploy
```bash
vercel --prod
```
Or push to `main` branch with auto-deploy enabled.

---

## 6. Post-Deploy Checklist

- [ ] Sign up with your `@neohomeloans.com` email
- [ ] Run seed script against production DB (or seed through Prisma Studio)
- [ ] Test sign-in / sign-up flow
- [ ] Verify dashboard loads with data
- [ ] Test a meeting creation → action item extraction (requires `ANTHROPIC_API_KEY`)

---

## Architecture

```
src/
  app/
    (auth)/          # Sign-in, sign-up pages
    (app)/           # Protected app pages (sidebar layout)
      dashboard/
      meetings/
      actions/
      tasks/
      tools/
      advisors/
      ideas/
      projects/      # Stub
      campaigns/     # Stub
      calendar/      # Stub
      analytics/     # Stub
      members/
      settings/      # Stub
    api/             # Route handlers (REST)
    auth/callback/   # Supabase OAuth callback
  components/
    auth/
    sidebar/
    topbar/
    meetings/
    actions/
    tools/
    advisors/
    tasks/
    ideas/
    ui/              # Shared components
  lib/
    db.ts            # Prisma client
    supabase-server.ts
    supabase-browser.ts
    auth-helpers.ts
    utils.ts
prisma/
  schema.prisma
  seed.ts
```
