# Design — add-mvp-platform (NexCuba MVP)

Technical design for the MVP. Spanish PO-facing rationale lives in
`proposal.md` and the capability specs; this document is for the build pipeline.

## 1. Architecture overview

```
┌─────────────────────────── Vercel ───────────────────────────┐
│  Next.js 15 (App Router, TS strict)                          │
│  ├─ Public routes (SSR/ISR, SEO)                             │
│  ├─ Company portal (auth-gated, RLS via user JWT)            │
│  ├─ Admin backoffice (role-gated)                            │
│  └─ Route handlers / server actions (zod-validated)          │
└───────────────┬──────────────────────────────────────────────┘
                │ supabase-js (anon key client-side; service role server-only)
┌───────────────▼──────────────────────────────────────────────┐
│  Supabase project (already provisioned)                      │
│  ├─ Postgres + RLS (source of truth)                         │
│  ├─ Auth (email/password; email confirmations)               │
│  ├─ Storage: media (public), verification-docs (private)     │
│  └─ pg_cron / edge functions: expiry jobs + transactional email (Resend)
└──────────────────────────────────────────────────────────────┘
```

- **Rendering:** public pages SSR/ISR for SEO; portal/backoffice client-heavy
  but all mutations through server actions or route handlers with server-side
  authorization. No business rule lives only in the client.
- **Design tokens:** from `design-spec.md` (Tailwind theme: Plus Jakarta Sans,
  ink `#111827`, gold `#E8C98A`, cream scale, radius-16 cards, pill buttons,
  no shadows).
- **Dual list view (D-5):** every public listing (companies, products,
  services, projects, opportunities, search results) renders two layouts from
  one data source: card grid (default desktop/tablet) and compact table
  (default mobile, `<md`). A `ViewToggle` segmented pill control sits beside
  each listing; choice persists in `sessionStorage` per section and never
  touches URL query params (filters/search/pagination stay untouched on
  switch). Table style: full-width, header row 12px uppercase gray-500, rows
  14px with subtle `gray-100` dividers, pill badges retained, row click →
  entity page.
- **Email:** Resend via its REST API, called server-side from the approval
  action (`src/lib/server/email.ts`) — keeps SMTP creds server-only
  (dependency D-2, PO approval). `RESEND_API_KEY` optional: missing key ⇒
  email skipped with a warning (dev/CI); an email failure never fails the
  approval itself. (A DB-webhook edge function remains an alternative if
  triggers move to the database later.)
- **Backoffice (H4):** every mutation runs with the admin's session client
  (RLS is the gate) through domain modules in
  `src/lib/server/backoffice/*`; the audit trail doubles as the Premium
  history. Expiry of Premium publishing rights is predicate-based
  (`premium_until > now()`); migration 0008 adds a notify-only, idempotent
  `sweep_expired_premium()` scheduled via pg_cron when available, plus
  `tags.is_active` so tag deactivation preserves `content_tags` history.
- **Public area (H5):** public pages render with a plain anon client
  (`src/lib/supabase/public.ts`, no cookies) so RLS-as-anon is the single
  visibility rule; queries live in `src/lib/public/queries.ts` behind
  `safeQuery` (graceful empty states — CI runs without Supabase env).
  `/empresas/[slug]` resolves by the DB-generated slug of migration 0009
  (display_name → legal_name, id-suffix dedupe, unique index). Sector and
  territory pages 404 when unknown or empty (funcional §24 thin-page guard);
  the municipality∈province composite FK is mirrored at routing level.

## 2. Data model (Postgres)

Conventions: `uuid` PKs (`gen_random_uuid()`), `created_at/updated_at`
`timestamptz` defaults, soft references via FK with `on delete` behavior.
All tables RLS-enabled. Enum-like values use Postgres enums or check
constraints.

| Table | Purpose / key columns |
|---|---|
| `profiles` | 1:1 `auth.users`. `id`, `role` (`company` \| `admin`), `company_id` |
| `companies` | `legal_name`, `entity_type` (`mipyme` \| `cooperative` \| `foreign`), `status` (`pending` \| `approved` \| `rejected`), `display_name`, `logo_path`, `description`, `phone`, `email`, `website`, `socials jsonb`, `address`, `province_id`, `municipality_id` (nullable for foreign), `profile_completeness smallint`, `is_featured bool`, `premium_until timestamptz null`, rejection/approval metadata |
| `registration_applications` | Snapshot of the application: applicant name/phone/email, submitted payload `jsonb`, `document_id` (nullable for foreign), `reviewed_by`, `reviewed_at`, `rejection_reason` |
| `verification_documents` | `company_application_id`, `storage_path`, `mime`, `size_bytes` — private bucket |
| `provinces` / `municipalities` | Official Cuban territory seed (15 provinces + Isla de la Juventud; 168 municipalities) |
| `sectors` | `name`, `slug`, `is_active` |
| `categories` | `scope` (`product` \| `service`), `name`, `slug`, `is_active` |
| `tags` | Free-form, normalized on write; `name`, `slug` |
| `company_sectors` | join `companies` × `sectors` |
| `products` | `company_id`, `name`, `category_id`, `description`, sector via company + `product_sectors` optional |
| `services` | + `coverage` enum (`local`,`provincial`,`national`,`international`) |
| `projects` | + `status` (project lifecycle label), `needs text`, `location` |
| `opportunities` | + `opportunity_type` enum (11 values from funcional §10.4) |
| `content_tags` | polymorphic join (`content_type`,`content_id`) × `tags` |
| `images` | polymorphic (`owner_type` company\|product\|…, `owner_id`), `storage_path`, `alt`, `position` |
| `contact_requests` | `requester_company_id`, `target_company_id`, `subject`, `message`, `status` (`pending`\|`accepted`), `accepted_at`; unique partial index on active pair to avoid duplicates while pending |
| `notifications` | `profile_id`, `type`, `payload jsonb`, `read_at` |
| `audit_log` | `admin_profile_id`, `action`, `entity`, `entity_id`, `metadata jsonb` |
| `crm_records` | `company_id` unique, `has_website`,`has_domain`,`has_corporate_email`,`has_socials bool`, `digital_needs text`, `commercial_potential` (`low\|medium\|high`), `followup_status`, `notes` |

Derived, not stored: all Fase 1 statistics (SQL views over the tables above).

### Profile completeness

Computed server-side as a weighted checklist (logo, description ≥ N chars,
≥1 sector, address/province/muni, phone, email, website, ≥1 social, gallery
≥1 image). Stored on write (`profile_completeness`) for cheap admin CRM reads.

## 3. Auth & registration flow

1. Public form (two variants: Cuban / foreign; both capture the access
   password + confirmation since login is email/password — the credential
   never reaches the application snapshot) → **server action** validates
   (zod) and creates: `auth.users` (email confirm), `companies` row
   (`status='pending'`), `registration_applications`, upload doc to private
   bucket (Cuban only). Runs as a saga with the service-role client and a
   compensating rollback (delete company + auth user) so a half application
   never survives.
2. User logs in → `profiles.role='company'`, middleware refreshes the session
   and applies the routing table (pure, unit-tested); the `/portal` layout
   checks `companies.status`: `pending` → portal shows "under review" screen
   only; `rejected` → same, with the manual email as the only communication
   channel; `/admin` layout gates on `role='admin'`. RLS is the final
   enforcement layer either way.
3. Admin approves (backoffice) → transaction sets `status='approved'`, writes
   `audit_log`, triggers approval email (edge function). Rejection stores the
   reason; email is sent manually by the admin from their own client
   (funcional §6.2.7) — the backoffice offers a "copy email address" affordance.
4. Email change (Configuración): staged change table/flow — verification email
   to the new address must be confirmed before `auth.users.email` updates.
   Password reset via Supabase Auth recovery.
5. Admins: created internally (seed + invite from an existing admin). No public
   path to `role='admin'`.

**Account takeover guard:** `company_id` is set at registration; a `profiles`
row can never change its `company_id` (revoke + trigger).

## 4. Row Level Security matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `companies` | public: `status='approved'` (public columns); owner: own row; admin: all | anon via signup flow (pending row) | owner own row (non-privileged cols); admin all | admin only |
| `products/services/projects/opportunities` | public: company approved **and** (cuban OR premium active) and not hidden; owner; admin | owner with publishing right (RLS + `with check`) | owner own; admin (incl. `is_hidden`) | owner own; admin |
| `registration_applications`, `verification_documents` | admin only | anon during signup (server action, service role) | admin | admin |
| `contact_requests` | both parties; admin read | requester with networking right (`with check`) | target company (accept only) | — |
| `taxonomies` (sectors/categories/tags) | public (active); admin CRUD | admin | admin | admin (soft-delete preferred) |
| `crm_records`, `audit_log` | admin only | admin/system | admin | — |
| `notifications` | owner | system | owner (mark read) | owner |

Key invariant encoded in RLS: **publishing right** = company `status='approved'`
AND (`entity_type != 'foreign'` OR `premium_until > now()`). Same predicate
reused for public SELECT of foreign content.

## 5. Storage

- Bucket `media` (public): images only. Path convention
  `{company_id}/{entity_type}/{entity_id}/{ulid}.{ext}`. Limits enforced by
  server action + storage policy: jpg/png/webp, ≤5 MB, ≤8 per entity.
- Bucket `verification-docs` (private): pdf/jpg/png, ≤10 MB, admin-read only;
  signed URLs (short TTL) for backoffice viewing.
- Uploads never trust client mime: validated server-side (magic bytes).

## 6. Search

- **General search:** Postgres FTS. `search_index` view/materialized approach:
  per-entity `tsvector` generated columns (name + description + tags) unified
  through a `search` RPC (`websearch_to_tsquery('spanish', …)`), returning
  grouped results (companies/products/services/projects/opportunities).
  Spanish config for unaccented matching.
- **Section filters:** plain indexed queries (`entity_type`, `sector`,
  `category`, `province`, `municipality`, `company`, `tag`, `verification`,
  `coverage`, `opportunity_type`) with keyset/limit pagination.
- **Default order:** `created_at DESC`.
- No external search service in MVP; the RPC boundary makes swapping to
  pg_trgm/Meili later a local change.

## 7. SEO & public surface

- App Router metadata API; canonical URLs; Open Graph; `sitemap.ts` split
  (static + entities, paginated sitemap index); `robots.ts`.
- Routes (Spanish UI, English slugs):
  `/` · `/empresas` · `/empresas/[slug]` · `/productos` · `/productos/[slug]`
  · `/servicios[/...]` · `/proyectos[/...]` · `/oportunidades[/...]`
  · `/sectores/[slug]` · `/p/[provincia]` (+ optional `/[municipio]`)
  · `/registro` (+ `/registro/extranjera`) · `/acceso` · legal pages.
- JSON-LD: `Organization` on company pages, `BreadcrumbList`, `WebSite` with
  SearchAction on home.
- Territorial/sector pages generated from taxonomy only when they have content
  (≥1 approved company) to avoid mass thin pages (funcional §24); others
  `noindex` or not generated.
- The global search bar sits below the main nav on every screen, centered,
  placeholder «Búsqueda general en nexcuba.org» (spec `search-discovery`).

## 8. i18n strategy (D-1)

Spanish-only UI. All strings in a typed dictionary module
(`src/locales/es.ts`); no hardcoded copy in components. Routing stays
i18n-ready (no locale segment in MVP; adding `/en` later is additive).

## 9. Testing strategy (Perfil B: TDD, ≥90%)

- **Unit (Vitest):** zod schemas, completeness calculator, RLS predicate
  helpers (pure functions), email templates, search query builders.
- **Integration (Vitest + supabase test project / pgTAP-style SQL tests):**
  RLS matrix (§4) as executable tests — each scenario of the specs that says
  "the server rejects" gets a test; registration flow; approval transaction;
  premium expiry job.
- **E2E (Playwright):** the five success criteria of `proposal.md` §6 as happy
  paths + the negative paths (FREE tries to publish; company A edits company
  B's content).
- Coverage gate 90% on `src/**` (statements/branches) in CI; strict TS
  (`noUncheckedIndexedAccess` etc.); ESLint + Prettier.

## 10. Security & NFR checklist (from funcional §23)

- Server-side validation on every mutation (zod) — client validation is UX only.
- Rate limiting on registration, login, contact requests (Upstash Redis or
  Vercel KV; fallback in-memory if cost-sensitive).
- Secrets: `.env` server-side only; `SERVICE_ROLE_KEY` never imported into
  client bundles (lint rule + CI check).
- Image handling: size/type validated server-side; served via CDN transforms.
- Accessibility target WCAG 2.1 AA essentials; Lighthouse ≥90 perf/a11y on
  public pages.
- Audit trail for admin critical actions (§`admin-backoffice`).
- Backups: Supabase daily (free tier PITR not available — documented
  limitation); export job weekly to start in Fase 1.

## 11. Risks / open items for later phases

- Premium content on expiry: default decision — content stays in DB, hidden
  from public views (`premium_until` predicate); company can re-activate.
- Email deliverability (Resend domain DNS) must exist before H3 demo.
- `sectors/categories` initial seed proposed during H2; PO reviews in
  backoffice (dependency D-4).
