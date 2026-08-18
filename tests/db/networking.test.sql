-- Networking in-app notifications (H8, migration 0012).
-- The notify_contact_request trigger creates notifications for the counterpart
-- profile on: (a) request INSERT → `contact_request_received` to the target;
-- (b) pending→accepted UPDATE → `contact_request_accepted` to the requester.
-- Notifications are system-created: session users cannot INSERT them.

-- ══════════════════════════════ FIXTURES ══════════════════════════════

insert into auth.users (id, email) values
  ('15000000-0000-4000-a000-000000000001', 'req@cubana.test'),  -- requester
  ('15000000-0000-4000-a000-000000000002', 'tgt@cubana.test');  -- target

insert into public.companies (id, legal_name, entity_type, status) values
  ('15000000-0000-4000-d000-000000000001', 'Requester R', 'mipyme', 'approved'),
  ('15000000-0000-4000-d000-000000000002', 'Target T', 'cooperative', 'approved');

insert into public.profiles (id, role, company_id) values
  ('15000000-0000-4000-a000-000000000001', 'company', '15000000-0000-4000-d000-000000000001'),
  ('15000000-0000-4000-a000-000000000002', 'company', '15000000-0000-4000-d000-000000000002');

-- ═══════════════════ 8.1 · NOTIFY ON REQUEST INSERT ═══════════════════

-- Clean slate for this suite (trigger rows only from our fixtures).
delete from public.notifications;

insert into public.contact_requests
  (requester_company_id, target_company_id, subject, message)
values
  ('15000000-0000-4000-d000-000000000001',
   '15000000-0000-4000-d000-000000000002', 'Colaboración', 'Hola T');

select assert.ok(
  (select count(*) from public.notifications
    where profile_id = '15000000-0000-4000-a000-000000000002'
      and type = 'contact_request_received') = 1,
  'net: al enviar solicitud se notifica a la receptora (received)');

select assert.ok(
  (select count(*) from public.notifications
    where profile_id = '15000000-0000-4000-a000-000000000001'
      and type = 'contact_request_received') = 0,
  'net: la solicitante no recibe aviso de su propio envío');

select assert.ok(
  (select n.payload->>'subject' = 'Colaboración'
     and n.payload->>'requester_company_id' = '15000000-0000-4000-d000-000000000001'
     and n.payload->>'target_company_id'   = '15000000-0000-4000-d000-000000000002'
     and n.payload->>'request_id' = (select cr.id::text from public.contact_requests cr
                                      where cr.requester_company_id = '15000000-0000-4000-d000-000000000001'
                                        and cr.target_company_id = '15000000-0000-4000-d000-000000000002')
   from public.notifications n
   where n.profile_id = '15000000-0000-4000-a000-000000000002'
     and n.type = 'contact_request_received'),
  'net: el payload identifica asunto, empresas y solicitud');

select assert.ok(
  (select count(*) from public.notifications
    where type = 'contact_request_accepted') = 0,
  'net: aún no hay aviso de aceptación mientras queda pendiente');

-- ═══════════════════ 8.2 · NOTIFY ON ACCEPT ═══════════════════

-- Only the target can accept (RLS + guard). Accept as target T.
set role authenticated;
select set_config('request.jwt.claim.sub', '15000000-0000-4000-a000-000000000002', false);

select assert.succeeds(
  'update public.contact_requests set status = ''accepted''
   where requester_company_id = ''15000000-0000-4000-d000-000000000001''
     and target_company_id = ''15000000-0000-4000-d000-000000000002''',
  'net: la receptora acepta la solicitud');

reset role;
select set_config('request.jwt.claim.sub', '', false);

select assert.ok(
  (select count(*) from public.notifications
    where profile_id = '15000000-0000-4000-a000-000000000001'
      and type = 'contact_request_accepted') = 1,
  'net: al aceptar se notifica a la solicitante (accepted)');

select assert.ok(
  (select count(*) from public.notifications
    where profile_id = '15000000-0000-4000-a000-000000000002'
      and type = 'contact_request_accepted') = 0,
  'net: la receptora no recibe aviso de su propia aceptación');

-- ═══════════════ 8.3 · SYSTEM-ONLY WRITES + OWNER READS ═══════════════

set role authenticated;
select set_config('request.jwt.claim.sub', '15000000-0000-4000-a000-000000000002', false);

select assert.throws(
  'insert into public.notifications (profile_id, type) values (''15000000-0000-4000-a000-000000000002'', ''spam'')',
  'net: un usuario no puede insertar notificaciones (system-only)');

select assert.ok(
  (select count(*) from public.notifications) = 1,
  'net: cada perfil solo ve sus notificaciones');

reset role;
select set_config('request.jwt.claim.sub', '', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '15000000-0000-4000-a000-000000000001', false);

select assert.ok(
  (select count(*) from public.notifications) = 1,
  'net: la solicitante ve solo su aviso de aceptación');

reset role;
select set_config('request.jwt.claim.sub', '', false);

select assert.finish();
