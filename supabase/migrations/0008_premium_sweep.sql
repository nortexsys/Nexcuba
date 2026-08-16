-- 0008 · Premium expiry sweep (tasks 4.4 / spec freemium-foreign-companies)
-- + tags soft-deactivation (task 4.5: CRUD "desactivación sin romper histórico").
--
-- Publishing rights expire automatically via the live predicate
-- (`premium_until > now()` in can_publish / is_company_content_public), so the
-- sweep's only job is to NOTIFY the affected company once. Idempotent by
-- design: safe to re-run, scheduled daily when pg_cron is available.

begin;

-- Tags historically had no is_active (H2); deleting one would cascade away
-- its content_tags history — deactivate instead, like sectors/categories.
alter table public.tags
  add column if not exists is_active boolean not null default true;

create index if not exists tags_active_idx on public.tags (is_active) where is_active;

create or replace function public.sweep_expired_premium()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  notified integer := 0;
begin
  -- Foreign companies whose premium expired within the last 7 days and have
  -- not been notified yet (the window tolerates missed cron runs).
  with expired as (
    select c.id as company_id, p.id as profile_id
    from public.companies c
    join public.profiles p on p.company_id = c.id
    where c.entity_type = 'foreign'
      and c.premium_until is not null
      and c.premium_until <= now()
      and c.premium_until > now() - interval '7 days'
      and not exists (
        select 1 from public.notifications n
        where n.profile_id = p.id and n.type = 'premium_expired'
      )
  )
  insert into public.notifications (profile_id, type, payload)
  select profile_id,
         'premium_expired',
         jsonb_build_object(
           'company_id', company_id,
           'premium_until', (select c.premium_until from public.companies c where c.id = company_id)
         )
  from expired;
  get diagnostics notified = row_count;
  return notified;
end;
$$;

revoke execute on function public.sweep_expired_premium() from public, anon, authenticated;
-- service_role / postgres only: the scheduler and internal tooling.

-- Daily schedule when the extension is present (Supabase); harmless notice on
-- plain PostgreSQL (local tests, CI service container).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    insert into cron.job (jobname, schedule, command)
    values (
      'nexcuba-premium-sweep',
      '17 3 * * *',
      $cron$ select public.sweep_expired_premium(); $cron$
    )
    on conflict (jobname) do update
      set schedule = excluded.schedule,
          command = excluded.command;
  else
    raise notice 'pg_cron not installed — sweep_expired_premium() available for manual runs';
  end if;
end;
$$;

commit;
