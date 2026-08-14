-- 0004 · Content tables (products, services, projects, opportunities),
-- tags, images + publishing-right predicates. Design.md §2/§4.
-- Rules encoded: no drafts (immediate publish), soft-hide for admin
-- intervention, FREE foreign companies cannot publish.

begin;

-- Publishing right: approved AND (cuban OR premium active). Single source of
-- truth reused by RLS INSERT checks and public SELECT visibility.
create or replace function public.can_publish(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.companies c
    where c.id = p_company
      and c.status = 'approved'
      and (c.entity_type <> 'foreign' or c.premium_until > now())
  );
$$;

-- Public visibility of a company's content (approved + not expired premium).
create or replace function public.is_company_content_public(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.companies c
    where c.id = p_company
      and c.status = 'approved'
      and (c.entity_type <> 'foreign' or c.premium_until > now())
  );
$$;

-- Does the session's own company hold the publishing right?
create or replace function public.own_can_publish()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_publish(public.own_company_id());
$$;

-- Networking right (spec networking): same predicate for Fase 1.
create or replace function public.own_can_network()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_publish(public.own_company_id());
$$;

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create type public.service_coverage as enum ('local', 'provincial', 'national', 'international');

create table public.services (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  coverage    public.service_coverage not null default 'national',
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null,
  description text,
  status_label text,  -- free lifecycle label (e.g. planificado / en ejecución / completado)
  needs       text,   -- necesidades u oportunidades asociadas
  location    text,
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create type public.opportunity_type as enum (
  'proveedor', 'cliente', 'socio', 'distribuidor', 'tecnologia',
  'equipamiento', 'materias_primas', 'servicios', 'financiacion',
  'inversion', 'otro'
);

create table public.opportunities (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  name              text not null,
  description       text,
  opportunity_type  public.opportunity_type not null,
  is_hidden         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger products_touch   before update on public.products
  for each row execute function public.touch_updated_at();
create trigger services_touch   before update on public.services
  for each row execute function public.touch_updated_at();
create trigger projects_touch   before update on public.projects
  for each row execute function public.touch_updated_at();
create trigger opportunities_touch before update on public.opportunities
  for each row execute function public.touch_updated_at();

-- Owners cannot hide/unhide their own content; that is admin intervention
-- (spec admin-backoffice "Intervención posterior sobre contenido"). System
-- context (no user JWT) is allowed to pass.
create or replace function public.guard_content_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_hidden is distinct from old.is_hidden
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'content visibility (is_hidden) is admin-only';
  end if;
  if new.company_id is distinct from old.company_id then
    raise exception 'content company_id is immutable';
  end if;
  return new;
end;
$$;

create trigger products_guard_visibility   before update on public.products
  for each row execute function public.guard_content_visibility();
create trigger services_guard_visibility   before update on public.services
  for each row execute function public.guard_content_visibility();
create trigger projects_guard_visibility   before update on public.projects
  for each row execute function public.guard_content_visibility();
create trigger opportunities_guard_visibility before update on public.opportunities
  for each row execute function public.guard_content_visibility();

-- ── Tags (hybrid classification) and images ──

create table public.content_tags (
  content_type text not null check (content_type in ('product', 'service', 'project', 'opportunity')),
  content_id   uuid not null,
  tag_id       uuid not null references public.tags (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (content_type, content_id, tag_id)
);

create index content_tags_tag_idx on public.content_tags (tag_id);

create table public.images (
  id           uuid primary key default gen_random_uuid(),
  owner_type   text not null check (owner_type in ('company', 'product', 'service', 'project', 'opportunity')),
  owner_id     uuid not null,
  storage_path text not null,
  alt          text,
  position     smallint not null default 0,
  created_at   timestamptz not null default now()
);

create index images_owner_idx on public.images (owner_type, owner_id);

-- Public visibility for an arbitrary entity (used by images RLS).
create or replace function public.is_entity_public(p_type text, p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_type = 'company' then
    return exists (select 1 from public.companies c
                   where c.id = p_id and c.status = 'approved');
  elsif p_type = 'product' then
    return exists (select 1 from public.products t
                   where t.id = p_id and not t.is_hidden
                     and public.is_company_content_public(t.company_id));
  elsif p_type = 'service' then
    return exists (select 1 from public.services t
                   where t.id = p_id and not t.is_hidden
                     and public.is_company_content_public(t.company_id));
  elsif p_type = 'project' then
    return exists (select 1 from public.projects t
                   where t.id = p_id and not t.is_hidden
                     and public.is_company_content_public(t.company_id));
  elsif p_type = 'opportunity' then
    return exists (select 1 from public.opportunities t
                   where t.id = p_id and not t.is_hidden
                     and public.is_company_content_public(t.company_id));
  end if;
  return false;
end;
$$;

-- Does the session's company own this entity? (images / content_tags RLS)
create or replace function public.owns_entity(p_type text, p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  mine uuid := public.own_company_id();
begin
  if p_type = 'company' then
    return p_id = mine;
  elsif p_type = 'product' then
    return exists (select 1 from public.products t where t.id = p_id and t.company_id = mine);
  elsif p_type = 'service' then
    return exists (select 1 from public.services t where t.id = p_id and t.company_id = mine);
  elsif p_type = 'project' then
    return exists (select 1 from public.projects t where t.id = p_id and t.company_id = mine);
  elsif p_type = 'opportunity' then
    return exists (select 1 from public.opportunities t where t.id = p_id and t.company_id = mine);
  end if;
  return false;
end;
$$;

-- Completeness recompute when company gallery changes (images address the
-- company through owner_type/owner_id, so they need their own resolver).
create or replace function public.images_completeness_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if tg_op = 'INSERT' and new.owner_type = 'company' then
    target := new.owner_id;
  elsif tg_op = 'DELETE' and old.owner_type = 'company' then
    target := old.owner_id;
  end if;
  if target is not null then
    perform public.recompute_company_completeness(target);
  end if;
  return null;
end;
$$;

create trigger images_company_completeness
  after insert or delete on public.images
  for each row execute function public.images_completeness_trigger();

create index products_company_idx   on public.products (company_id, created_at desc);
create index services_company_idx   on public.services (company_id, created_at desc);
create index projects_company_idx   on public.projects (company_id, created_at desc);
create index opportunities_company_idx on public.opportunities (company_id, created_at desc);

grant select on
  public.products, public.services, public.projects, public.opportunities,
  public.images, public.content_tags
to anon;
grant select, insert, update, delete on
  public.products, public.services, public.projects, public.opportunities,
  public.images
to authenticated, service_role;
grant select, insert, delete on public.content_tags to authenticated, service_role;

commit;
