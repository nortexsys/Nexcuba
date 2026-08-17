-- 0009 · Public company slugs (H5): SEO-friendly /empresas/[slug] URLs.
-- The slug derives from the commercial name (display_name, fallback
-- legal_name), stays stable enough for link sharing, and is de-duplicated
-- with a short id suffix when two companies share the same name.

begin;

alter table public.companies
  add column if not exists slug text;

create or replace function public.set_company_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
begin
  base := public.slugify(coalesce(nullif(trim(new.display_name), ''), new.legal_name));
  if base is null or base = '' then
    base := substr(new.id::text, 1, 12);  -- defensive: uuid always unique
  end if;
  if exists (
    select 1 from public.companies c
    where c.slug = base and c.id is distinct from new.id
  ) then
    base := base || '-' || substr(new.id::text, 1, 8);
  end if;
  new.slug := base;
  return new;
end;
$$;

create trigger companies_set_slug
  before insert or update of display_name, legal_name on public.companies
  for each row execute function public.set_company_slug();

-- Backfill existing rows (sequential updates make the de-duplication work).
update public.companies set display_name = display_name;

alter table public.companies alter column slug set not null;
create unique index if not exists companies_slug_key on public.companies (slug);

commit;
