-- 0010 · Portal enablers (H6).
-- 1. Profile edits recompute profile_completeness (H2 triggers only covered
--    company_sectors and images; direct company updates left it stale).
--    The recompute now updates only on score changes, so the company-side
--    trigger recursion terminates after one pass.
-- 2. Free-form tags: companies can CREATE tags while tagging content (spec
--    taxonomies: "libres, normalizadas al escribir"); rename/deactivate
--    stays admin-only.

begin;

create or replace function public.recompute_company_completeness(p_company uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  score integer;
  c public.companies;
begin
  select * into c from public.companies where id = p_company;
  if c is null then
    return 0;
  end if;
  score := 0;
  if coalesce(c.logo_path, '')    <> '' then score := score + 10; end if;
  if length(coalesce(c.description, '')) >= 80 then score := score + 15; end if;
  if exists (select 1 from public.company_sectors cs where cs.company_id = c.id)
                                    then score := score + 10; end if;
  if coalesce(c.address, '')      <> '' then score := score + 10; end if;
  if c.province_id is not null and c.municipality_id is not null
                                    then score := score + 10; end if;
  if coalesce(c.phone, '')        <> '' then score := score + 10; end if;
  if coalesce(c.email, '')        <> '' then score := score + 10; end if;
  if coalesce(c.website, '')      <> '' then score := score + 10; end if;
  if jsonb_array_length(c.socials) > 0 then score := score + 5;  end if;
  if exists (
    select 1 from public.images i
    where i.owner_type = 'company' and i.owner_id = c.id
  )                               then score := score + 10; end if;
  -- Update only on change: keeps the new companies-side trigger acyclic.
  update public.companies set profile_completeness = score
   where id = c.id and profile_completeness is distinct from score;
  return score;
end;
$$;

create or replace function public.companies_completeness_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_company_completeness(new.id);
  return null;
end;
$$;

create trigger companies_completeness
  after update of display_name, description, logo_path, phone, email,
               website, socials, address, province_id, municipality_id
  on public.companies
  for each row execute function public.companies_completeness_trigger();

-- Free-form tags: any authenticated company can add a new tag name while
-- publishing; uniqueness is enforced by constraints. Editing stays admin-only.
create policy tags_insert_authenticated on public.tags
  for insert to authenticated
  with check (true);

commit;
