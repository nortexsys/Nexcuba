# Tasks — add-mvp-platform (NexCuba MVP)

Ordered by dependency (milestones H1–H10 from `proposal.md`). One task = one
unit of work for the executor agent. Profile B: **TDD mandatory** — each task
that produces code writes the failing test first unless it is pure config or
scaffolding. Do not skip ahead.

## H1 · Scaffolding & tooling

- [x] 1.1 Scaffold Next.js 15 App Router + TypeScript strict (`noUncheckedIndexedAccess`, `strict`), ESLint, Prettier, Vitest + Testing Library + Playwright wired, CI workflow (lint, typecheck, tests, coverage ≥90% gate)
- [x] 1.2 Tailwind design tokens from `design-spec.md` (Plus Jakarta Sans via `next/font`, ink/gold/cream scales, radius-16 cards, pill buttons) + base components (`Button`, `Card`, `Badge`, `Chip`, `ViewToggle`, `DataTable`) with unit tests + visual smoke (Playwright screenshots) — dual list view per spec `public-directory` (cards default desktop/tablet, table default mobile)
- [x] 1.3 App shell: sticky header (nav + login/register pill buttons), global search bar container below nav (centered, placeholder «Búsqueda general en nexcuba.org» — wiring in 7.x), cream footer with 4 columns; error/not-found/loading primitives
- [x] 1.4 Supabase client wiring: typed client factory (browser anon / server anon / server service-role), zod env schema, lint rule + CI check that service-role never reaches client bundles

## H2 · Data foundation

- [x] 2.1 Migration: territory seed (`provinces`, `municipalities` — 15 + Isla de la Juventud, 168 municipios) + integration tests for chained selectors' data
- [x] 2.2 Migration: taxonomies (`sectors`, `categories`, `tags`) + initial seed (PO-reviewable via backoffice later, dependency D-4) + `company_sectors`
- [x] 2.3 Migration: `companies`, `profiles`, `registration_applications`, `verification_documents` with enums and constraints
- [x] 2.4 Migration: content tables (`products`, `services`, `projects`, `opportunities`, `content_tags`, `images`) with publishing-right predicate helper (SQL function `can_publish(company_id)`)
- [x] 2.5 Migration: `contact_requests`, `notifications`, `audit_log`, `crm_records` + statistics views (all Fase 1 counters)
- [x] 2.6 RLS baseline: apply the full RLS matrix (design §4) with pgTAP/integration tests per policy — every spec scenario saying "the server rejects" maps to a test here
- [x] 2.7 Storage: buckets `media` (public) and `verification-docs` (private), path conventions, size/type server validation helpers (magic bytes) with unit tests

## H3 · Auth & registration

- [x] 3.1 Server action + form: Cuban company registration (all §6.1 fields, doc upload to private bucket, zod validation, pending company + application rows, auth user + email confirmation) — TDD on action + integration on flow
- [x] 3.2 Server action + form: foreign company registration (website required, no document) — TDD incl. missing-website rejection
- [x] 3.3 Login + middleware: session, company-status gate (`pending`/`rejected` → "under review" screen), admin role gate for `/admin/*`
- [x] 3.4 Approval flow: admin approve transaction (`status='approved'`, audit_log, trigger approval email via edge function `send-email` w/ Resend — dependency D-2) + rejection path (reason stored, copy-email affordance) — TDD
- [x] 3.5 Email change with verification to new address + password reset (Supabase recovery) — TDD on staging logic

## H4 · Admin backoffice

- [x] 4.1 Backoffice layout + admin guard + audit_log write helper for all critical actions
- [x] 4.2 Applications inbox: list/filter, detail view with document viewer (signed URL), approve/reject actions (uses 3.4) — E2E happy + negative
- [x] 4.3 Companies management: list/detail, edit administrative fields, toggle featured (reflects in home) — TDD
- [x] 4.4 Manual Premium: activate with 12-month expiry, history, `premium_until` predicate effects (publishing + public visibility) + `pg_cron` expiry sweep — TDD on predicate + job
- [x] 4.5 Taxonomies manager: CRUD sectors/categories/opportunity-types/tags with soft-deactivate that preserves history — TDD
- [x] 4.6 Content oversight: browse all content, hide/unhide (audit-logged), delete — TDD on visibility predicate
- [x] 4.7 Networking overview (basic consult) — lists with statuses
- [x] 4.8 Statistics dashboard: all Fase 1 counters + altas/publicaciones evolution chart (from views) — snapshot tests
- [x] 4.9 CRM module: per-company digitalization record (internal-only, RLS admin-only) — TDD incl. invisibility to company/public

## H5 · Public area

- [x] 5.1 Home: dark hero (72px H1, CTA), stats band, sector cards, featured companies section (from `is_featured`), how-it-works, final CTA — visual per `design-spec.md`
- [x] 5.2 Companies directory: dual-view listing (cards/table, `ViewToggle` + `DataTable`) with grid cards (logo, name, verified badge, sector, location, 2-line description, stats, view profile) + section filters (type, sector, province, municipality, verification) — TDD on filter queries and view-mode defaults
- [x] 5.3 Company public profile: full §9 ficha (all fields, gallery, published content tabs, public contact block, internal contact button gated by networking right)
- [x] 5.4 Content sections: products grid, services list, projects, opportunities with section filters and dual view (cards/table) — TDD on queries
- [x] 5.5 Sector pages `/sectores/[slug]` + territory pages `/p/[provincia](/[municipio])` generated only when non-empty (thin-page guard) — TDD

## H6 · Company portal

- [ ] 6.1 Portal layout with 8-section nav + dashboard (completeness indicator, counts per content type, pending networking) — TDD on completeness calculator
- [ ] 6.2 Mi empresa: profile editor (all ficha fields), gallery manager (≤8 images, limits), immediate public reflection — TDD
- [ ] 6.3 Content CRUD ×4: create/edit/delete forms per `content-publishing` fields (coverage for services, status/needs for projects, type for opportunities), tags input, image upload with limits — TDD incl. FREE-foreign rejection
- [ ] 6.4 Configuración: email change flow entry point, password change — links to 3.5 services

## H7 · Search

- [ ] 7.1 FTS migration: generated `tsvector` columns ('spanish' config, unaccented) + unified `search_all(query)` RPC grouped by entity — TDD on matching/relevance basics
- [ ] 7.2 Global search bar wiring: submit → results page grouped by 5 entity types, only approved/visible content, default `created_at DESC`, dual view per group — E2E from any screen
- [ ] 7.3 Section search + filter chips sync to URL (shareable/back-button-safe) — TDD on URL builders

## H8 · Networking

- [ ] 8.1 Contact request: server action (subject+message, RLS with-check on requester right), pending state, duplicate-pending guard — TDD
- [ ] 8.2 Accept flow: accept action (target-only), contact lists on both sides, accepted notification + emails both moments — TDD
- [ ] 8.3 Notifications: in-app bell/inbox (`notifications` table, read state) — TDD + E2E

## H9 · SEO, a11y, performance

- [ ] 9.1 Metadata API everywhere: titles/descriptions/canonical/OG per route; JSON-LD (Organization, BreadcrumbList, WebSite+SearchAction)
- [ ] 9.2 `sitemap.ts` (entities + taxonomy pages, paginated index) + `robots.ts`; noindex rules for thin pages
- [ ] 9.3 Accessibility pass (WCAG 2.1 AA essentials: landmarks, labels, contrast — verify gold-on-dark ratios, focus states) + axe tests in Playwright
- [ ] 9.4 Performance pass: image CDN transforms, ISR for public pages, font optimization; Lighthouse ≥90 on home/directory/profile — CI budget check

## H10 · Verification (Fase 5 prep)

- [ ] 10.1 Map every scenario of the 9 capability specs to automated tests; fill gaps until coverage ≥90% and all green
- [ ] 10.2 Adversarial review pass (independent validator): RLS bypass attempts, IDOR on content/contact endpoints, storage abuse, rate limits, signup spam, SQL injection via search RPC
- [ ] 10.3 Fix findings (spec update first if behavior changes — base-standards §7), then `/verify` report against acceptance criteria

> **H3 build notes (2026-08-14).** Decisions taken during implementation,
> recorded for traceability:
> - **Access credentials at registration.** The funcional §6 fields don't
>   mention a password, but login is email+password (Supabase Auth), so both
>   registration forms capture `password` + confirmation (min 8 chars). The
>   credential never reaches `registration_applications.payload`.
> - **Approval email (3.4).** Sent directly from the server action via the
>   Resend REST API (`src/lib/server/email.ts`) instead of a DB-webhook edge
>   function — same secrecy (server-side only), one moving part less.
>   `RESEND_API_KEY` optional: missing key ⇒ email skipped with a warning
>   (dev/CI stay green). design.md §1 updated accordingly.
> - **Gates split (3.3).** `middleware.ts` refreshes the session and applies
>   the routing table (`src/lib/auth/session.ts`, unit-tested); the
>   company-status screen and the admin gate live in the `/portal` and
>   `/admin` layouts (DB-aware), with RLS as final enforcement.
> - **`/admin` minimal landing**: pending-applications counter only; the
>   review UI (inbox, doc viewer, copy-email) is task 4.2.
> - **e2e fix**: the nav smoke test now opens the burger menu on mobile
>   viewports (latent bug — CI only ran chromium).

> **H4 build notes (2026-08-16).** Decisions taken during implementation,
> recorded for traceability:
> - **Premium history (4.4)** is the audit log itself (`company.premium.*`
>   entries with `premium_until` metadata) — no extra table in Fase 1.
> - **Expiry sweep (migration 0008)**: publishing rights already expire via the
>   live `premium_until > now()` predicate, so `sweep_expired_premium()` only
>   notifies the affected foreign company once (7-day window, idempotent);
>   pg_cron schedule is created only when the extension exists.
> - **tags.is_active (4.5)** added in 0008 — deleting a tag would cascade away
>   its content_tags history; soft-deactivate matches sectors/categories.
> - **Slugs** are DB-generated columns; the backoffice never computes them.
> - **E2E scope (4.2)**: the negative authorization path (anonymous → redirect
>   to /acceso) is automated for /admin and /portal. The happy-path inbox flow
>   is covered by unit tests over the domain modules plus the SQL RLS suite;
>   a full browser E2E needs a seeded Supabase project in CI (revisit in H10).
> - **ESLint**: `@/lib/server/*` imports are allowed across `src/app/**`
>   (server components + actions). The real guards stay in place:
>   `import 'server-only'` on the service client and the CI secrets check.

> **H5 build notes (2026-08-16).**
> - **Company slugs (migration 0009)**: `/empresas/[slug]` resolves by a
>   DB-generated slug (display_name → legal_name fallback, deduplicated with a
>   short-id suffix, unique index, backfilled; renaming regenerates it).
> - **Public client**: server-rendered public pages use a plain anon client
>   (`src/lib/supabase/public.ts`, no cookies) so RLS-as-anon is the only
>   visibility rule. All public queries go through `safeQuery` — Supabase
>   outages or missing config degrade to empty states, never 500s (verified
>   in CI, which runs without env).
> - **Verification filter (§12.3)** omitted from the directory UI: every
>   listed company is verified by construction (RLS only exposes approved);
>   a control that cannot change results would be misleading.
> - **Sector pages** list the sector's approved companies; cross-company
>   "associated content" queries arrive with H7's unified search. Territory
>   pages verify municipality∈province at routing level (composite FK).
> - **Thin-page guard (§24)**: unknown or empty sector/territory pages render
>   404 instead of indexable empty listings (asserted in e2e).
> - **Internal contact button** on the ficha is gated server-side by
>   `computeNetworkingRight` (cuban approved / foreign premium) and links to
>   `/portal/contactos?empresa=slug` — the request form itself is H8.
> - e2e: Playwright has no `test.each`; parameterized runs use plain loops.
> - **PENDIENTE CRÍTICO**: the real Supabase project still has NO migrations
>   applied (schema cache empty) — home/directory render empty against it.
>   Apply 0001–0009 via SQL editor or `supabase db push` before any demo.
