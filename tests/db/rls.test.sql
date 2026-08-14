-- RLS + constraint + guard-trigger test suite.
-- Fixtures are created as the table owner (RLS-bypassing superuser), then
-- probes run under `set role authenticated` with a simulated JWT subject.

-- ══════════════════════════════ FIXTURES ══════════════════════════════

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'a@cubana.test'),      -- company A (cuban)
  ('00000000-0000-4000-a000-00000000000b', 'b@cubana.test'),      -- company B (cuban)
  ('00000000-0000-4000-a000-00000000000c', 'c@pendiente.test'),   -- pending company
  ('00000000-0000-4000-a000-00000000000f', 'free@foreign.test'),  -- foreign FREE
  ('00000000-0000-4000-a000-0000000000d0', 'premium@foreign.test'),-- foreign PREMIUM
  ('00000000-0000-4000-a000-0000000000e0', 'expired@foreign.test'),-- foreign expired
  ('00000000-0000-4000-a000-0000000000ad', 'admin@nexcuba.org');  -- admin

insert into public.companies (id, legal_name, entity_type, status, premium_until) values
  ('10000000-0000-4000-a000-00000000000a', 'Cubana A', 'mipyme', 'approved', null),
  ('10000000-0000-4000-a000-00000000000b', 'Cubana B', 'cooperative', 'approved', null),
  ('10000000-0000-4000-a000-00000000000c', 'Pendiente C', 'mipyme', 'pending', null),
  ('10000000-0000-4000-a000-00000000000f', 'Foreign FREE', 'foreign', 'approved', null),
  ('10000000-0000-4000-a000-0000000000d0', 'Foreign PREMIUM', 'foreign', 'approved', now() + interval '6 months'),
  ('10000000-0000-4000-a000-0000000000e0', 'Foreign EXPIRED', 'foreign', 'approved', now() - interval '1 day');

insert into public.profiles (id, role, company_id) values
  ('00000000-0000-4000-a000-00000000000a', 'company', '10000000-0000-4000-a000-00000000000a'),
  ('00000000-0000-4000-a000-00000000000b', 'company', '10000000-0000-4000-a000-00000000000b'),
  ('00000000-0000-4000-a000-00000000000c', 'company', '10000000-0000-4000-a000-00000000000c'),
  ('00000000-0000-4000-a000-00000000000f', 'company', '10000000-0000-4000-a000-00000000000f'),
  ('00000000-0000-4000-a000-0000000000d0', 'company', '10000000-0000-4000-a000-0000000000d0'),
  ('00000000-0000-4000-a000-0000000000e0', 'company', '10000000-0000-4000-a000-0000000000e0'),
  ('00000000-0000-4000-a000-0000000000ad', 'admin',   null);

insert into public.products (id, company_id, name, description) values
  ('20000000-0000-4000-a000-00000000000a', '10000000-0000-4000-a000-00000000000a', 'Producto de A', 'visible'),
  ('20000000-0000-4000-a000-00000000000c', '10000000-0000-4000-a000-00000000000c', 'Producto de C', 'pending company'),
  ('20000000-0000-4000-a000-00000000000f', '10000000-0000-4000-a000-00000000000f', 'Producto FREE', 'free foreign (should not exist publicly)'),
  ('20000000-0000-4000-a000-0000000000e0', '10000000-0000-4000-a000-0000000000e0', 'Producto EXPIRED', 'expired premium'),
  ('20000000-0000-4000-a000-0000000000a1', '10000000-0000-4000-a000-00000000000a', 'Producto oculto', 'hidden by admin');
update public.products set is_hidden = true where id = '20000000-0000-4000-a000-0000000000a1';

insert into public.contact_requests (requester_company_id, target_company_id, subject, message)
values ('10000000-0000-4000-a000-00000000000a', '10000000-0000-4000-a000-00000000000b', 'Colaboración', 'Hola B');

insert into public.registration_applications (id, company_id, applicant_name, applicant_email)
values ('30000000-0000-4000-a000-00000000000c', '10000000-0000-4000-a000-00000000000c', 'Solicitante C', 'c@pendiente.test');

insert into public.verification_documents (application_id, storage_path, mime, size_bytes)
values ('30000000-0000-4000-a000-00000000000c', 'verification-docs/c/doc.pdf', 'application/pdf', 1024);

insert into public.crm_records (company_id) values ('10000000-0000-4000-a000-00000000000a');

-- ════════════════════════ TERRITORY (task 2.1) ════════════════════════

select assert.ok((select count(*) from public.provinces) = 16, 'territorio: 16 provincias');
select assert.ok((select count(*) from public.municipalities) = 168, 'territorio: 168 municipios');
select assert.ok(
  (select count(*) from public.municipalities m join public.provinces p on p.id = m.province_id
   where p.slug = 'pinar-del-rio') = 11,
  'territorio: Pinar del Río tiene 11 municipios');
select assert.ok(
  exists (select 1 from public.municipalities where slug = 'san-juan-y-martinez'),
  'territorio: slug sin acentos (san-juan-y-martinez)');

-- ═════════════════ PUBLIC VISIBILITY (specs public-directory, content) ═════════════════

set role anon;

select assert.ok(
  (select count(*) from public.companies) = 5,
  'anon ve solo las 5 empresas aprobadas (pendiente C invisible)');
select assert.ok(
  (select count(*) from public.products) = 1,
  'anon ve solo el producto público de A (C pendiente, FREE, EXPIRED y oculto invisibles)');

reset role;

-- ═════════════════ CONTENT OWNERSHIP + PUBLISHING RIGHT (2.4/2.6) ═════════════════

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000a', false);

select assert.throws(
  'insert into public.products (company_id, name) values (''10000000-0000-4000-a000-00000000000b'', ''intruso'')',
  'A no puede publicar en nombre de B (with check)');
select assert.succeeds(
  'update public.products set description = ''visible v2'' where id = ''20000000-0000-4000-a000-00000000000a''',
  'A edita su propio producto');

select assert.throws(
  'update public.products set is_hidden = true where id = ''20000000-0000-4000-a000-00000000000a''',
  'A no puede ocultar su propio contenido (is_hidden admin-only)');
select assert.throws(
  'update public.companies set is_featured = true where id = ''10000000-0000-4000-a000-00000000000a''',
  'A no puede auto-destacarse (columna privilegiada)');
select assert.throws(
  'update public.companies set premium_until = now() + interval ''1 year'' where id = ''10000000-0000-4000-a000-00000000000a''',
  'A no puede autoconcederse Premium');
select assert.throws(
  'update public.profiles set company_id = ''10000000-0000-4000-a000-00000000000b'' where id = ''00000000-0000-4000-a000-00000000000a''',
  'A no puede cambiar su company_id (account-takeover guard)');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- FREE foreign cannot publish; PREMIUM can; expired cannot.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000f', false);

select assert.throws(
  'insert into public.products (company_id, name) values (''10000000-0000-4000-a000-00000000000f'', ''no free'')',
  'extranjera FREE no puede publicar (RLS)');

reset role;
select set_config('request.jwt.claim.sub', '', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-0000000000d0', false);

select assert.succeeds(
  'insert into public.products (company_id, name) values (''10000000-0000-4000-a000-0000000000d0'', ''premium ok'')',
  'extranjera PREMIUM puede publicar');

reset role;
select set_config('request.jwt.claim.sub', '', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-0000000000e0', false);

select assert.throws(
  'insert into public.opportunities (company_id, name, opportunity_type) values (''10000000-0000-4000-a000-0000000000e0'', ''op'', ''cliente'')',
  'extranjera con Premium caducado no puede publicar');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- Pending company: blocked from publishing even though it "owns" rows.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000c', false);

select assert.throws(
  'insert into public.services (company_id, name) values (''10000000-0000-4000-a000-00000000000c'', ''serv'')',
  'empresa pendiente no puede publicar');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ═════════════════ NETWORKING (spec networking) ═════════════════

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000a', false);

select assert.succeeds(
  'insert into public.contact_requests (requester_company_id, target_company_id, subject, message) values (''10000000-0000-4000-a000-00000000000a'', ''10000000-0000-4000-a000-0000000000d0'', ''Hola'', ''Mensaje'')',
  'cubana aprobada inicia solicitud de contacto');
select assert.throws(
  'insert into public.contact_requests (requester_company_id, target_company_id, subject, message) values (''10000000-0000-4000-a000-00000000000a'', ''10000000-0000-4000-a000-00000000000a'', ''yo'', ''auto'')',
  'auto-contacto rechazado (check constraint)');

reset role;
select set_config('request.jwt.claim.sub', '', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000f', false);

select assert.throws(
  'insert into public.contact_requests (requester_company_id, target_company_id, subject, message) values (''10000000-0000-4000-a000-00000000000f'', ''10000000-0000-4000-a000-00000000000a'', ''free'', ''no puede'')',
  'extranjera FREE no puede iniciar networking');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- Only the target accepts; requester cannot modify; duplicate pending blocked.
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000a', false);

select assert.succeeds(
  'update public.contact_requests set status = ''accepted'' where requester_company_id = ''10000000-0000-4000-a000-00000000000a'' and target_company_id = ''10000000-0000-4000-a000-00000000000b''',
  'A intenta aceptar su propia solicitud (RLS: no-op silencioso)');
select assert.ok(
  (select status from public.contact_requests
    where requester_company_id = '10000000-0000-4000-a000-00000000000a'
      and target_company_id = '10000000-0000-4000-a000-00000000000b') = 'pending',
  'la solicitante no puede aceptar su propia solicitud (sigue pendiente)');
select assert.throws(
  'insert into public.contact_requests (requester_company_id, target_company_id, subject, message) values (''10000000-0000-4000-a000-00000000000a'', ''10000000-0000-4000-a000-00000000000b'', ''dup'', ''otra vez'')',
  'no se duplica una solicitud pendiente (unique partial index)');

reset role;
select set_config('request.jwt.claim.sub', '', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000b', false);

select assert.succeeds(
  'update public.contact_requests set status = ''accepted'' where requester_company_id = ''10000000-0000-4000-a000-00000000000a'' and target_company_id = ''10000000-0000-4000-a000-00000000000b''',
  'la receptora acepta la solicitud');
select assert.ok(
  (select count(*) from public.contact_requests cr
    where cr.requester_company_id = '10000000-0000-4000-a000-00000000000a'
      and cr.target_company_id = '10000000-0000-4000-a000-00000000000b'
      and cr.status = 'accepted' and cr.accepted_at is not null) = 1,
  'aceptada queda con timestamp');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ═════════════════ ADMIN-ONLY AREAS (spec admin-backoffice) ═════════════════

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000a', false);

select assert.ok(
  (select count(*) from public.registration_applications) = 0,
  'empresa A no ve solicitudes de registro');
select assert.ok(
  (select count(*) from public.verification_documents) = 0,
  'empresa A no ve documentos de verificación');
select assert.ok(
  (select count(*) from public.crm_records) = 0,
  'empresa A no ve el CRM interno (ni el suyo)');
select assert.throws(
  'select public.get_stats_counters()',
  'estadísticas solo para admin (función gated)');
select assert.ok(
  (select count(*) from public.contact_requests) = 2,
  'A ve solo sus solicitudes (A→B aceptada + A→P pendiente), no las de otros');

reset role;
select set_config('request.jwt.claim.sub', '', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-0000000000ad', false);

select assert.ok(
  (select count(*) from public.registration_applications) = 1,
  'admin ve todas las solicitudes');
select assert.ok(
  (select count(*) from public.verification_documents) = 1,
  'admin ve los documentos de verificación');
select assert.ok(
  (select count(*) from public.crm_records) = 1,
  'admin ve el CRM interno');
select assert.succeeds('select public.get_stats_counters()', 'admin consulta estadísticas');
select assert.succeeds(
  'update public.products set is_hidden = false where id = ''20000000-0000-4000-a000-0000000000a1''',
  'admin desoculta contenido (intervención posterior)');
select assert.succeeds(
  'update public.companies set is_featured = true where id = ''10000000-0000-4000-a000-00000000000a''',
  'admin destaca una empresa');
select assert.succeeds(
  'update public.companies set premium_until = now() + interval ''12 months'' where id = ''10000000-0000-4000-a000-00000000000f''',
  'admin activa Premium manual (D-2)');
select assert.succeeds(
  'insert into public.audit_log (admin_profile_id, action, entity) values (''00000000-0000-4000-a000-0000000000ad'', ''approve'', ''company'')',
  'admin escribe en audit_log');

reset role;
select set_config('request.jwt.claim.sub', '', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-00000000000a', false);

select assert.throws(
  'insert into public.audit_log (admin_profile_id, action, entity) values (''00000000-0000-4000-a000-00000000000a'', ''fake'', ''x'')',
  'empresa no puede escribir audit_log');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- ═════════════════ COMPLETENESS (task 2.3 helper) ═════════════════

select assert.ok(
  public.recompute_company_completeness('10000000-0000-4000-a000-00000000000b') = 0,
  'completitud 0 sin datos');
update public.companies set
  logo_path = 'logo.png', description = repeat('x', 100), address = 'Calle 1',
  province_id = 1, municipality_id = 1, phone = '+53', email = 'b@test',
  website = 'https://b.test', socials = '[{"platform":"instagram","url":"https://ig.com/b"}]'
where id = '10000000-0000-4000-a000-00000000000b';
insert into public.company_sectors (company_id, sector_id)
  values ('10000000-0000-4000-a000-00000000000b', (select id from public.sectors limit 1));
insert into public.images (owner_type, owner_id, storage_path)
  values ('company', '10000000-0000-4000-a000-00000000000b', 'media/b/galeria-1.jpg');
select assert.ok(
  public.recompute_company_completeness('10000000-0000-4000-a000-00000000000b') = 100,
  'completitud 100 con perfil completo + sector + galería');

-- ═════════════════ CONSTRAINTS (task 2.3) ═════════════════

select assert.throws(
  'insert into public.companies (legal_name, entity_type, province_id, municipality_id)
   values (''Geo mal'', ''mipyme'', 1, 20)',
  'municipio debe pertenecer a la provincia (FK compuesto)');

-- ═════════════════ SUMMARY ═════════════════

select assert.finish();
