-- 0012 · Networking notifications (spec networking, tasks 8.1–8.3).
-- In-app alerts are created by the SYSTEM (this trigger), never by the session
-- client — notifications table has no INSERT policy (0006) on purpose. The
-- requester is notified when a request is accepted; the target when a request
-- arrives. Emails are handled by the app layer (best effort, D-2).

begin;

create or replace function public.notify_contact_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  payload jsonb;
begin
  if tg_op = 'INSERT' then
    select p.id into recipient
    from public.profiles p
    where p.company_id = new.target_company_id
    limit 1;
    payload := jsonb_build_object(
      'request_id', new.id,
      'requester_company_id', new.requester_company_id,
      'target_company_id', new.target_company_id,
      'subject', new.subject
    );
    if recipient is not null then
      insert into public.notifications (profile_id, type, payload)
      values (recipient, 'contact_request_received', payload);
    end if;
  elsif old.status = 'pending' and new.status = 'accepted' then
    select p.id into recipient
    from public.profiles p
    where p.company_id = new.requester_company_id
    limit 1;
    payload := jsonb_build_object(
      'request_id', new.id,
      'requester_company_id', new.requester_company_id,
      'target_company_id', new.target_company_id
    );
    if recipient is not null then
      insert into public.notifications (profile_id, type, payload)
      values (recipient, 'contact_request_accepted', payload);
    end if;
  end if;
  return null;
end;
$$;

create trigger contact_requests_notify
  after insert or update on public.contact_requests
  for each row execute function public.notify_contact_request();

commit;
