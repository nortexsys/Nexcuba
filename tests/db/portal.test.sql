-- Portal-domain test suite (H6): completeness recompute on profile edits and
-- free-form tag creation. Runs after rls.test.sql and backoffice.test.sql.

-- ══════════════════════════ FIXTURES ══════════════════════════

insert into auth.users (id, email) values
  ('00000000-0000-4000-c000-00000000000a', 'portal@cubana.test'),
  ('00000000-0000-4000-c000-0000000000f0', 'portal-free@foreign.test');

insert into public.companies (id, legal_name, entity_type, status) values
  ('13000000-0000-4000-c000-00000000000a', 'Portal SL', 'mipyme', 'approved'),
  ('13000000-0000-4000-c000-0000000000f0', 'Foreign Free SL', 'foreign', 'approved');

insert into public.profiles (id, role, company_id) values
  ('00000000-0000-4000-c000-00000000000a', 'company', '13000000-0000-4000-c000-00000000000a'),
  ('00000000-0000-4000-c000-0000000000f0', 'company', '13000000-0000-4000-c000-0000000000f0');

-- ═══════════════════ completeness recompute (6.1/6.2, migration 0010) ═══════════════════

select assert.ok(
  (select profile_completeness from public.companies where id = '13000000-0000-4000-c000-00000000000a') = 0,
  'portal: completitud inicial 0');

update public.companies
  set description = repeat('Descripción larga y completa de la empresa para superar el umbral. ', 2),
      phone = '+53 5 000 0000',
      website = 'https://portal.test'
  where id = '13000000-0000-4000-c000-00000000000a';

select assert.ok(
  (select profile_completeness from public.companies where id = '13000000-0000-4000-c000-00000000000a') = 35,
  'portal: editar perfil recomputa (descripción 15 + teléfono 10 + web 10)');

update public.companies
  set socials = '[{"platform":"instagram","url":"https://instagram.com/portal"}]'::jsonb
  where id = '13000000-0000-4000-c000-00000000000a';

select assert.ok(
  (select profile_completeness from public.companies where id = '13000000-0000-4000-c000-00000000000a') = 40,
  'portal: añadir redes suma 5 (el trigger de socials funciona y no entra en bucle)');

-- Idempotence: a no-op update keeps the same score (recursion terminated).
update public.companies set phone = '+53 5 000 0000'
  where id = '13000000-0000-4000-c000-00000000000a';
select assert.ok(
  (select profile_completeness from public.companies where id = '13000000-0000-4000-c000-00000000000a') = 40,
  'portal: update sin cambios mantiene la puntuación');

-- ═══════════════════ free-form tags (6.3, migration 0010) ═══════════════════

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-c000-00000000000a', false);

select assert.succeeds(
  'insert into public.tags (name) values (''café de especialidad'')',
  'tags: una empresa puede crear una etiqueta nueva');

-- RLS UPDATE/DELETE denials filter silently (USING): the statement "succeeds"
-- but must affect zero rows.
select assert.succeeds(
  'update public.tags set name = ''hack'' where name = ''café de especialidad''',
  'tags: update de empresa no lanza error (RLS filtra)');
select assert.ok(
  not exists (select 1 from public.tags where name = 'hack'),
  'tags: una empresa NO puede editar etiquetas (0 filas afectadas)');
select assert.succeeds(
  'delete from public.tags where name = ''café de especialidad''',
  'tags: delete de empresa no lanza error (RLS filtra)');
select assert.ok(
  exists (select 1 from public.tags where name = 'café de especialidad'),
  'tags: una empresa NO puede borrar etiquetas (la fila sigue)');

-- The slug column is generated (unaccented): sanity via the row itself.
select assert.ok(
  exists (select 1 from public.tags where name = 'café de especialidad' and slug = 'cafe-de-especialidad'),
  'tags: el slug se genera sin acentos');

reset role;
select set_config('request.jwt.claim.sub', '', false);

select assert.finish();
