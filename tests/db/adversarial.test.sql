-- H10 · Adversarial review suite (task 10.2).
-- Cross-check the security findings called out in H10: IDOR across companies
-- (content + profiles), the service_role boundary (bypass expected, but only
-- for the server), SQL injection through the `search_all` RPC, and storage
-- bucket/policy setup (validated when the storage schema exists, i.e. on a
-- real Supabase instance — a no-op skip on plain Postgres CI).
--
-- Reuses the fixture users/companies created by rls.test.sql (runs first) and
-- adds a few content rows in its own id range. `notifications` is left
-- untouched at the end so networking.test.sql's global counts still hold.

grant usage on schema assert to service_role;
grant execute on all functions in schema assert to service_role;
grant insert, select on assert.results to service_role;

-- ══════════════════════════ FIXTURES (own id range) ══════════════════════════

insert into public.products (id, company_id, name, description, is_hidden) values
  ('16000000-0000-4000-a000-0000000000b1', '10000000-0000-4000-a000-00000000000b',
   'Producto oculto de B', 'no visible', true),
  ('16000000-0000-4000-a000-0000000000c1', '10000000-0000-4000-a000-00000000000c',
   'Producto de C', 'empresa pendiente', false);

insert into public.services (id, company_id, name, description) values
  ('16000000-0000-4000-a000-0000000000b2', '10000000-0000-4000-a000-00000000000b',
   'Servicio de B', 'desde B');

insert into public.notifications (profile_id, type, payload) values
  ('00000000-0000-4000-a000-0000000000ad', 'test_h10', '{}'::jsonb);

-- ════════════════════════ RLS IS ACTUALLY ON ════════════════════════

select assert.ok(
  (select count(*) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in ('companies', 'profiles', 'products', 'services',
                       'projects', 'opportunities', 'contact_requests',
                       'notifications', 'images', 'content_tags')
     and c.relrowsecurity) = 10,
  'adversarial: RLS habilitado en las tablas de negocio');

-- ════════════════════════════ IDOR (10.2) ════════════════════════════

-- Company A must not be able to mutate or read another company's content.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000a', false);

select assert.succeeds(
  'update public.services set description = ''hacked'' where id = ''16000000-0000-4000-a000-0000000000b2''',
  'A intenta editar un servicio de B (no lanza: RLS lo vuelve no-op)');
select assert.ok(
  (select description from public.services
    where id = '16000000-0000-4000-a000-0000000000b2') = 'desde B',
  'A no modificó el servicio de B (sigue con su descripción)');

select assert.succeeds(
  'delete from public.services where id = ''16000000-0000-4000-a000-0000000000b2''',
  'A intenta borrar un servicio de B (no lanza: RLS no-op)');
select assert.ok(
  (select count(*) from public.services
    where id = '16000000-0000-4000-a000-0000000000b2') = 1,
  'A no borró el servicio de B');

select assert.ok(
  (select count(*) from public.products
    where id = '16000000-0000-4000-a000-0000000000b1') = 0,
  'A no ve el contenido oculto de B (no hay fuga IDOR)');
select assert.ok(
  (select count(*) from public.products
    where id = '16000000-0000-4000-a000-0000000000c1') = 0,
  'A no ve el contenido de la empresa pendiente C');

-- Profiles: A can only see/update its own row.
select assert.ok(
  (select count(*) from public.profiles
    where id = '00000000-0000-4000-a000-00000000000b') = 0,
  'A no ve el perfil de B');
select assert.succeeds(
  'update public.profiles set role = ''admin'' where id = ''00000000-0000-4000-a000-00000000000b''',
  'A intenta escalar el rol de B (no-op)');

reset role;
select set_config('request.jwt.claim.sub', '', false);

select assert.ok(
  (select role from public.profiles
    where id = '00000000-0000-4000-a000-00000000000b') = 'company',
  'el rol de B no cambió (A no pudo escalarlo)');

-- Notifications: A cannot read a notification owned by another profile.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000a', false);

select assert.ok(
  (select count(*) from public.notifications
    where profile_id = '00000000-0000-4000-a000-0000000000ad') = 0,
  'A no ve las notificaciones del admin');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- Symmetric IDOR from company B against company A's content.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000b', false);

select assert.succeeds(
  'update public.products set description = ''sabotaje'' where id = ''20000000-0000-4000-a000-00000000000a''',
  'B intenta editar un producto de A (no-op)');
select assert.ok(
  (select description from public.products
    where id = '20000000-0000-4000-a000-00000000000a') = 'visible v2',
  'B no modificó el producto de A');
select assert.succeeds(
  'delete from public.products where id = ''20000000-0000-4000-a000-00000000000a''',
  'B intenta borrar el producto de A (no-op)');
select assert.ok(
  (select count(*) from public.products
    where id = '20000000-0000-4000-a000-00000000000a') = 1,
  'B no borró el producto de A');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ════════════════════ SERVICE_ROLE BOUNDARY (10.2) ════════════════════

-- The server (service_role) intentionally bypasses RLS: signup/approval run
-- as the service. Verify the bypass exists and is scoped to that role only.
set role service_role;

select assert.ok(
  (select count(*) from public.companies
    where id = '10000000-0000-4000-a000-00000000000c') = 1,
  'service_role ve la empresa pendiente (bypass esperado para el servidor)');
select assert.ok(
  (select count(*) from public.products
    where id = '16000000-0000-4000-a000-0000000000b1') = 1,
  'service_role ve contenido oculto (bypass esperado)');

select assert.succeeds(
  'insert into public.products (company_id, name) values (''10000000-0000-4000-a000-00000000000a'', ''service ok'')',
  'service_role puede insertar contenido (flujo de aprobación)');

reset role;

-- The public face must still be the RLS matrix (anitya: after the bypass,
-- anon still only sees approved + public content).
set role anon;
select assert.ok(
  (select count(*) from public.products
    where id in ('16000000-0000-4000-a000-0000000000b1', '16000000-0000-4000-a000-0000000000c1')) = 0,
  'anon no ve contenido oculto/pendiente tras el test de service_role');
reset role;

-- ════════════════════ SQL INJECTION: search_all (10.2) ════════════════════

-- `search_all` feeds the query to websearch_to_tsquery — it is never
-- concatenated into SQL. Payloads that try to break out must yield zero rows
-- and leave the schema intact.
select assert.ok(
  (select count(*) from public.search_all($$'); drop table public.companies; --$$)) = 0,
  'sql-injection: payload con DROP no ejecuta (0 filas)');
select assert.ok(
  (select to_regclass('public.companies')) is not null,
  'sql-injection: la tabla companies sigue existiendo');
select assert.ok(
  (select count(*) from public.search_all($$' OR 1=1 --$$)) = 0,
  'sql-injection: OR 1=1 no filtra todo el catálogo');
select assert.ok(
  (select count(*) from public.search_all($$cafe'; select pg_sleep(999); --$$)) = 0,
  'sql-injection: el payload multi-sentencia no se ejecuta');
select assert.ok(
  (select count(*) from public.companies) > 0,
  'sql-injection: las filas de companies siguen intactas');

-- ════════════════════ STORAGE POLICIES (10.2, condicional) ════════════════════

-- On plain Postgres (CI) the storage schema does not exist and migration 0007
-- is a no-op — here we only assert the invariant holds when storage exists
-- (real Supabase), so the check still runs in production-shaped environments.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    if not exists (
      select 1 from storage.buckets where id = 'media' and public
        and file_size_limit = 5242880
    ) then
      raise exception 'storage: bucket media (público, 5MB) mal configurado';
    end if;
    if not exists (
      select 1 from storage.buckets where id = 'verification-docs' and not public
        and file_size_limit = 10485760
    ) then
      raise exception 'storage: bucket verification-docs (privado, 10MB) mal configurado';
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'media public read'
    ) then
      raise exception 'storage: falta la policy de lectura pública de media';
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and policyname = 'verification-docs admin read'
    ) then
      raise exception 'storage: falta la policy de lectura admin de verification-docs';
    end if;
    raise notice 'storage: buckets y policies verificados';
  else
    raise notice 'storage: schema no presente (plain Postgres/CI), verificación omitida';
  end if;
end
$$;

-- ════════════════════ CLEANUP ════════════════════

-- Remove the probe notification so networking.test.sql counts are unaffected.
delete from public.notifications where type = 'test_h10';
delete from public.products where id = '16000000-0000-4000-a000-0000000000b1'
   or id = '16000000-0000-4000-a000-0000000000c1';
delete from public.services where id = '16000000-0000-4000-a000-0000000000b2';

select assert.finish();
