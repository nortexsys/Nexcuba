-- 0005 · Networking, notifications, audit log, CRM + Fase 1 statistics views.
-- Design.md §2/§5. Pending requests have no rejection state (funcional §14.2).

begin;

create type public.contact_status as enum ('pending', 'accepted');

create table public.contact_requests (
  id                    uuid primary key default gen_random_uuid(),
  requester_company_id  uuid not null references public.companies (id) on delete cascade,
  target_company_id     uuid not null references public.companies (id) on delete cascade,
  subject               text not null,
  message               text not null,
  status                public.contact_status not null default 'pending',
  accepted_at           timestamptz,
  created_at            timestamptz not null default now(),
  check (requester_company_id <> target_company_id)
);

-- One active (pending) request per direction; history is kept once accepted.
create unique index contact_requests_active_pair_idx
  on public.contact_requests (requester_company_id, target_company_id)
  where status = 'pending';

create index contact_requests_target_idx on public.contact_requests (target_company_id, status);
create index contact_requests_requester_idx on public.contact_requests (requester_company_id, status);

-- Only the target may accept, only pending→accepted, nothing else changes.
create or replace function public.guard_contact_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.requester_company_id is distinct from old.requester_company_id
     or new.target_company_id is distinct from old.target_company_id
     or new.subject is distinct from old.subject
     or new.message is distinct from old.message then
    raise exception 'contact_requests: immutable fields cannot change';
  end if;
  if public.own_company_id() is distinct from old.target_company_id
     and not public.is_admin() then
    raise exception 'contact_requests: only the target company can respond';
  end if;
  if old.status = 'pending' and new.status = 'accepted' then
    new.accepted_at := now();
  elsif new.status is distinct from old.status then
    raise exception 'contact_requests: only pending→accepted is allowed';
  end if;
  return new;
end;
$$;

create trigger contact_requests_guard before update on public.contact_requests
  for each row execute function public.guard_contact_request_update();

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

create table public.audit_log (
  id               uuid primary key default gen_random_uuid(),
  admin_profile_id uuid not null references public.profiles (id) on delete restrict,
  action           text not null,
  entity           text not null,
  entity_id        uuid,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- Convenience writer for backoffice critical actions (used from H4).
create or replace function public.audit(
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.audit_log (admin_profile_id, action, entity, entity_id, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_metadata);
$$;

create type public.commercial_potential as enum ('low', 'medium', 'high');

create table public.crm_records (
  company_id            uuid primary key references public.companies (id) on delete cascade,
  has_website           boolean not null default false,
  has_domain            boolean not null default false,
  has_corporate_email   boolean not null default false,
  has_socials           boolean not null default false,
  profile_completeness_snapshot smallint not null default 0,
  digital_needs         text,
  commercial_potential  public.commercial_potential not null default 'low',
  followup_status       text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger crm_records_touch before update on public.crm_records
  for each row execute function public.touch_updated_at();

-- ── Fase 1 statistics views (funcional §20.1) ──

create or replace view public.v_stats_counters as
select
  (select count(*) from public.companies)                                            as companies_total,
  (select count(*) from public.companies where status = 'approved')                  as companies_verified,
  (select count(*) from public.companies where entity_type = 'mipyme')               as mipyemes,
  (select count(*) from public.companies where entity_type = 'cooperative')          as cooperatives,
  (select count(*) from public.companies
     where entity_type = 'foreign'
       and not (premium_until > now()))                                              as foreign_free,
  (select count(*) from public.companies
     where entity_type = 'foreign' and premium_until > now())                        as foreign_premium,
  (select count(*) from public.products
     where public.is_company_content_public(company_id) and not is_hidden)           as products_published,
  (select count(*) from public.services
     where public.is_company_content_public(company_id) and not is_hidden)           as services_published,
  (select count(*) from public.projects
     where public.is_company_content_public(company_id) and not is_hidden)           as projects_published,
  (select count(*) from public.opportunities
     where public.is_company_content_public(company_id) and not is_hidden)           as opportunities_published,
  (select count(*) from public.contact_requests)                                     as contact_requests_total,
  (select count(*) from public.contact_requests where status = 'pending')            as contact_requests_pending,
  (select count(*) from public.contact_requests where status = 'accepted')           as contacts_established;

-- Monthly evolution of company approvals and content publication.
create or replace view public.v_stats_evolution as
select
  date_trunc('month', m.month)                                            as month,
  (select count(*) from public.companies c
     where date_trunc('month', c.created_at) = date_trunc('month', m.month)) as companies_created,
  (select count(*) from public.products p
     where date_trunc('month', p.created_at) = date_trunc('month', m.month)) as products_created,
  (select count(*) from public.services s
     where date_trunc('month', s.created_at) = date_trunc('month', m.month)) as services_created,
  (select count(*) from public.projects pr
     where date_trunc('month', pr.created_at) = date_trunc('month', m.month)) as projects_created,
  (select count(*) from public.opportunities o
     where date_trunc('month', o.created_at) = date_trunc('month', m.month)) as opportunities_created
from generate_series(
       (select date_trunc('month', min(created_at)) from public.companies),
       date_trunc('month', now()),
       interval '1 month'
     ) as m(month);

grant select on public.contact_requests to authenticated, service_role;
grant insert, update on public.contact_requests to authenticated, service_role;
grant select, update on public.notifications to authenticated, service_role;
grant insert on public.contact_requests to authenticated;
grant select, insert on public.audit_log to authenticated, service_role;
grant select, insert, update, delete on public.crm_records to authenticated, service_role;

-- Views cannot have RLS, so they stay owner-only and are exposed through
-- admin-gated security-definer functions (backoffice use, spec admin-backoffice).
create or replace function public.get_stats_counters()
returns setof public.v_stats_counters
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'statistics are admin-only';
  end if;
  return query select * from public.v_stats_counters;
end;
$$;

create or replace function public.get_stats_evolution()
returns setof public.v_stats_evolution
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'statistics are admin-only';
  end if;
  return query select * from public.v_stats_evolution;
end;
$$;

revoke execute on function public.get_stats_counters() from public, anon;
revoke execute on function public.get_stats_evolution() from public, anon;
grant execute on function public.get_stats_counters() to authenticated, service_role;
grant execute on function public.get_stats_evolution() to authenticated, service_role;

commit;
