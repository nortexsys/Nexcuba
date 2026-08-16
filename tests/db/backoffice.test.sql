-- Backoffice-domain test suite (H4): premium expiry sweep (migration 0008).
-- Runs on the same migration chain as rls.test.sql in a fresh database.

-- ══════════════════════════ FIXTURES ══════════════════════════

insert into auth.users (id, email) values
  ('00000000-0000-4000-b000-00000000000f', 'recien-caducada@foreign.test'),
  ('00000000-0000-4000-b000-0000000000a0', 'antigua@foreign.test'),
  ('00000000-0000-4000-b000-0000000000c0', 'activa@foreign.test'),
  ('00000000-0000-4000-b000-0000000000d0', 'mipyme@caducada.test');

insert into public.companies (id, legal_name, entity_type, status, premium_until) values
  -- expired yesterday → inside the 7-day notification window
  ('11000000-0000-4000-b000-00000000000f', 'Caducada recientemente', 'foreign', 'approved', now() - interval '1 day'),
  -- expired three months ago → outside the window, never notified
  ('11000000-0000-4000-b000-0000000000a0', 'Caducada antigua', 'foreign', 'approved', now() - interval '3 months'),
  -- active premium → must not be touched
  ('11000000-0000-4000-b000-0000000000c0', 'Premium activa', 'foreign', 'approved', now() + interval '6 months'),
  -- cuban with a stale premium_until → out of scope (premium is foreign-only)
  ('11000000-0000-4000-b000-0000000000d0', 'MIPYME con resto', 'mipyme', 'approved', now() - interval '2 days');

insert into public.profiles (id, role, company_id) values
  ('00000000-0000-4000-b000-00000000000f', 'company', '11000000-0000-4000-b000-00000000000f'),
  ('00000000-0000-4000-b000-0000000000a0', 'company', '11000000-0000-4000-b000-0000000000a0'),
  ('00000000-0000-4000-b000-0000000000c0', 'company', '11000000-0000-4000-b000-0000000000c0'),
  ('00000000-0000-4000-b000-0000000000d0', 'company', '11000000-0000-4000-b000-0000000000d0');

-- ═════════════════════ sweep_expired_premium (4.4) ═════════════════════

-- 1 · notifies the recently-expired foreign companies. Two qualify: the one
-- seeded here AND rls.test.sql's "Foreign EXPIRED" (ran first, same window).
select assert.ok(
  public.sweep_expired_premium() = 2,
  'sweep: notifica las 2 caducadas recientes (fixture propia + rls)');

select assert.ok(
  exists (
    select 1 from public.notifications n
    where n.profile_id = '00000000-0000-4000-b000-00000000000f'
      and n.type = 'premium_expired'
      and n.payload->>'company_id' = '11000000-0000-4000-b000-00000000000f'
  ),
  'sweep: la notificación lleva el perfil y el company_id correctos');

select assert.ok(
  not exists (
    select 1 from public.notifications n
    where n.profile_id in (
      '00000000-0000-4000-b000-0000000000a0',  -- antigua (fuera de ventana)
      '00000000-0000-4000-b000-0000000000c0',  -- activa
      '00000000-0000-4000-b000-0000000000d0'   -- mipyme
    )
  ),
  'sweep: ignora caducadas antiguas, premium activo y no extranjeras');

-- 2 · publishing right already expired via predicate (no cron needed for that)
select assert.ok(
  not public.can_publish('11000000-0000-4000-b000-00000000000f'),
  'sweep: can_publish ya es false para la caducada (predicado vivo)');
select assert.ok(
  public.can_publish('11000000-0000-4000-b000-0000000000c0'),
  'sweep: can_publish sigue true para premium activa');

-- 3 · idempotent: a second run notifies nobody new
select assert.ok(
  public.sweep_expired_premium() = 0,
  'sweep: segunda pasada no duplica notificaciones');

-- 4 · non-privileged roles cannot execute the sweep
set role authenticated;
select assert.throws(
  'select public.sweep_expired_premium()',
  'sweep: authenticated no puede ejecutar el barrido');
reset role;

-- ═════════════════ tags soft-deactivate preserves history (4.5) ═════════════════

insert into public.tags (id, name) values ('40000000-0000-4000-b000-0000000000d1', 'orgánico');
insert into public.content_tags (content_type, content_id, tag_id)
values ('product', '20000000-0000-4000-a000-00000000000a', '40000000-0000-4000-b000-0000000000d1');

update public.tags set is_active = false where id = '40000000-0000-4000-b000-0000000000d1';

select assert.ok(
  exists (select 1 from public.content_tags
          where tag_id = '40000000-0000-4000-b000-0000000000d1'),
  'tags: desactivar NO elimina el histórico (content_tags intacto)');
select assert.ok(
  (select is_active from public.tags where id = '40000000-0000-4000-b000-0000000000d1') = false,
  'tags: is_active = false tras desactivar');

select assert.finish();
