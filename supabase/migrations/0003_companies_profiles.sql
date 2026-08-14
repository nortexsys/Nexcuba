-- 0003 · Companies, profiles, registration applications, verification docs.
-- Design.md §2/§3. Rules: one company = one user; account-takeover guard;
-- municipality must belong to the chosen province.

begin;

create type public.entity_type as enum ('mipyme', 'cooperative', 'foreign');
create type public.company_status as enum ('pending', 'approved', 'rejected');
create type public.user_role as enum ('company', 'admin');

create table public.companies (
  id                   uuid primary key default gen_random_uuid(),
  legal_name           text not null,
  display_name         text,
  entity_type          public.entity_type not null,
  status               public.company_status not null default 'pending',
  description          text,
  logo_path            text,
  phone                text,
  email                text,
  website              text,
  socials              jsonb not null default '[]'::jsonb,
  address              text,
  province_id          smallint references public.provinces (id) on delete restrict,
  municipality_id      smallint,
  profile_completeness smallint not null default 0,
  is_featured          boolean not null default false,
  premium_until        timestamptz,
  approved_at          timestamptz,
  approved_by          uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Territory consistency: the municipality must belong to the province.
  foreign key (municipality_id, province_id)
    references public.municipalities (id, province_id) on delete restrict
);

create index companies_status_idx on public.companies (status);
create index companies_entity_type_idx on public.companies (entity_type);
create index companies_province_idx on public.companies (province_id);
create index companies_municipality_idx on public.companies (municipality_id);
create index companies_featured_idx on public.companies (is_featured) where is_featured;

create trigger companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  role       public.user_role not null default 'company',
  company_id uuid references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_company_idx on public.profiles (company_id);

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Table-level privileges (RLS filters rows on top of these).
grant select on public.companies to anon;
grant select, update on public.companies to authenticated, service_role;
grant select, update on public.profiles to authenticated, service_role;

-- ── Helper identity functions (used by triggers here and by RLS in 0006) ──

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.own_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id from public.profiles p where p.id = auth.uid();
$$;

-- Account-takeover guard: a profile never changes its company; role changes
-- only via admin or system context (no user JWT: migrations, service jobs).
create or replace function public.guard_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.company_id is distinct from new.company_id then
    raise exception 'profiles.company_id is immutable';
  end if;
  if old.role is distinct from new.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'profiles.role can only be changed by an administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_identity before update on public.profiles
  for each row execute function public.guard_profile_identity();

-- Privileged columns of companies are admin-only (status transitions happen
-- through the approval transaction; premium/featured via backoffice).
create or replace function public.guard_company_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;  -- system context (no user JWT) or administrator
  end if;
  if new.status       is distinct from old.status
     or new.entity_type    is distinct from old.entity_type
     or new.is_featured    is distinct from old.is_featured
     or new.premium_until  is distinct from old.premium_until
     or new.approved_at    is distinct from old.approved_at
     or new.approved_by    is distinct from old.approved_by then
    raise exception 'companies: privileged columns are admin-only';
  end if;
  return new;
end;
$$;

create trigger companies_guard_privileged before update on public.companies
  for each row execute function public.guard_company_privileged_columns();

-- ── Registration applications (snapshot) & verification documents ──

create table public.registration_applications (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null unique references public.companies (id) on delete cascade,
  applicant_name   text not null,
  applicant_email  text not null,
  applicant_phone  text,
  payload          jsonb not null default '{}'::jsonb,
  status           public.company_status not null default 'pending',
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz not null default now()
);

create index registration_applications_status_idx
  on public.registration_applications (status);

create table public.verification_documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.registration_applications (id) on delete cascade,
  storage_path   text not null,
  mime           text not null,
  size_bytes     integer not null,
  created_at     timestamptz not null default now()
);

grant select, update on public.registration_applications to authenticated, service_role;
grant select on public.verification_documents to authenticated, service_role;

-- ── Profile completeness (design.md §2: weighted checklist, 0–100) ──

create or replace function public.recompute_company_completeness(p_company uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  score integer := 0;
  c public.companies;
begin
  select * into c from public.companies where id = p_company;
  if c is null then
    return 0;
  end if;
  if coalesce(c.logo_path, '')    <> '' then score := score + 10; end if; -- logo
  if length(coalesce(c.description, '')) >= 80 then score := score + 15; end if; -- description
  if exists (select 1 from public.company_sectors cs where cs.company_id = c.id)
                                    then score := score + 10; end if; -- ≥1 sector
  if coalesce(c.address, '')      <> '' then score := score + 10; end if;
  if c.province_id is not null and c.municipality_id is not null
                                    then score := score + 10; end if; -- territory
  if coalesce(c.phone, '')        <> '' then score := score + 10; end if;
  if coalesce(c.email, '')        <> '' then score := score + 10; end if;
  if coalesce(c.website, '')      <> '' then score := score + 10; end if;
  if jsonb_array_length(c.socials) > 0 then score := score + 5;  end if;
  if exists (
    select 1 from public.images i
    where i.owner_type = 'company' and i.owner_id = c.id
  )                               then score := score + 10; end if; -- gallery
  update public.companies set profile_completeness = score where id = c.id;
  return score;
end;
$$;

create or replace function public.company_completeness_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  target := coalesce(new.company_id, old.company_id);
  perform public.recompute_company_completeness(target);
  return null;
end;
$$;

-- images table arrives in 0004; the sector trigger can be created now.
create trigger company_sectors_completeness
  after insert or delete on public.company_sectors
  for each row execute function public.company_completeness_trigger();

commit;
