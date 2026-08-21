# GroupBuy B2B

A React + Supabase implementation of the `GroupBuy B2B` wireframe (see
`../GroupBuy B2B wireframe spec-handoff/`). Buyers pool purchase orders with
nearby businesses to unlock supplier volume-pricing tiers; suppliers manage
their own catalog and tier pricing per pool, and draft AI-narrated order
summaries once a pool's window closes.

## Stack

- **Frontend**: React 19 + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS v4, lucide-react icons.
- **Backend**: Supabase — Postgres with row-level security, Supabase Auth (passwordless magic-link email), 3 Edge Functions that proxy the Anthropic Claude API for the AI features.
- **Supabase project**: `groupbuy-b2b` (ref `okilngqwfnftesyogmgh`, org `Andrew-sudo-create's Org`).

## Setup

```bash
cd app
npm install
cp .env.example .env   # already points at the provisioned groupbuy-b2b project
npm run dev
```

Open http://localhost:5173. Choose "I'm a buyer" or "I'm a supplier", enter an
email, and click the sign-in link that arrives (Supabase's default auth email
sender — expect it within a minute; check spam). First-time sign-ins land on
an onboarding form (business details for buyers, company details for
suppliers) before reaching their dashboard.

## AI features

Three Supabase Edge Functions (`supabase/functions/ai-*`) call the Anthropic
Messages API server-side:

- `ai-pledge-suggestion` — suggests a pledge quantity from a free-text business description.
- `ai-demand-profile` — turns a buyer's "Order & stock notes" (Account page) into a demand estimate + pool-match reason.
- `ai-order-narrative` — drafts the prose summary on the Order Summary page.

They're already deployed but **no `ANTHROPIC_API_KEY` is set yet**, so each
returns a clean error and the UI shows the same "AI unavailable" messaging the
wireframe specifies — nothing crashes. To enable them:

1. Get an API key from https://console.anthropic.com/.
2. In the [Supabase dashboard](https://supabase.com/dashboard/project/okilngqwfnftesyogmgh/settings/functions) → Edge Functions → Secrets, add `ANTHROPIC_API_KEY`.
   (Or via the CLI: `supabase secrets set ANTHROPIC_API_KEY=sk-... --project-ref okilngqwfnftesyogmgh`.)
3. Optionally set `ANTHROPIC_MODEL` (defaults to `claude-sonnet-5`).

No redeploy needed — the functions read the secret at request time.

## Database

Schema, RLS policies and helper functions live as migrations applied via the
Supabase MCP tools (not checked in as local `.sql` files, since they were
authored directly against the live project). Key tables:

- `buyer_profiles` / `supplier_profiles` — one row per signed-up account (id = `auth.users.id`).
- `pools` — a neighborhood buying group; each has its own countdown (`window_close_at`, default 62h from creation) and delivery location.
- `supplier_pool_links` — the invite/request relationship between a supplier and a pool (`pending` → `active`/`declined`, `initiated_by` tracks who proposed it). A supplier's items only appear in a pool once this is `active`.
- `items` / `item_tiers` — each supplier's own catalog and volume-pricing tiers (3 tiers by convention, editable).
- `pledges` — a buyer's committed quantity for one item, scoped to their pool.
- `settings` — per-buyer notification toggles.

Regenerate `src/lib/database.types.ts` after any schema change via the
Supabase MCP `generate_typescript_types` tool (or `supabase gen types
typescript --project-id okilngqwfnftesyogmgh`).

## Deliberate differences from the wireframe

See the build plan (`../GroupBuy B2B wireframe spec-handoff/` sibling
discussion) for the full rationale — in short: real magic-link auth replaces
the wireframe's credential-less demo flow (so the "Demo buyer/supplier"
shortcut buttons are gone), pool countdowns are per-pool instead of global,
catalogs are per-supplier instead of one shared list, supplier↔pool access is
invite/request-based instead of automatic, and the Order Summary screen is
scoped to a (pool, supplier) pair rather than just a pool.
