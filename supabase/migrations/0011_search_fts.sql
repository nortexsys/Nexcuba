-- 0011 · Full-text search (H7). Design.md §6.
-- 1. Accent-folded (unaccented) Spanish tsvector per searchable entity,
--    stored as a GENERATED column (name + description) and GIN-indexed.
--    Note: the `unaccent` extension is STABLE in Postgres, so it cannot feed
--    a generated column; we fold accents with the project's existing
--    immutable `translate` pattern (same source as public.slugify).
-- 2. RPC `search_all(query)` returns matches across companies, products,
--    services, projects and opportunities, grouped by entity. Tag/sector/
--    territory terms extend the base tsvector match (join-based). Only
--    publicly visible rows are returned, matching the RLS public matrix.

begin;

-- Immutable accent folding (Spanish + ñ/ç), reused by the generated columns
-- and by the RPC query folding. Single source of truth for "unaccented".
create or replace function public.fold_accent(raw text)
returns text
language sql
immutable
strict
as $$
  select translate(
    raw,
    'áàäâéèëêíìïîóòöôúùüûñçÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑÇ',
    'aaaaeeeeiiiioooouuuuncAAAAEEEEIIIIOOOOUUUUNC'
  );
$$;

-- ── per-entity tsvector (immutable expression ⇒ safe in generated columns) ──

alter table public.companies
  add column search_tsv tsvector
  generated always as (
    to_tsvector('spanish', public.fold_accent(
      coalesce(legal_name, '') || ' ' ||
      coalesce(display_name, '') || ' ' ||
      coalesce(description, '')
    ))
  ) stored;

alter table public.products
  add column search_tsv tsvector
  generated always as (
    to_tsvector('spanish', public.fold_accent(coalesce(name, '') || ' ' || coalesce(description, '')))
  ) stored;

alter table public.services
  add column search_tsv tsvector
  generated always as (
    to_tsvector('spanish', public.fold_accent(coalesce(name, '') || ' ' || coalesce(description, '')))
  ) stored;

alter table public.projects
  add column search_tsv tsvector
  generated always as (
    to_tsvector('spanish', public.fold_accent(coalesce(name, '') || ' ' || coalesce(description, '')))
  ) stored;

alter table public.opportunities
  add column search_tsv tsvector
  generated always as (
    to_tsvector('spanish', public.fold_accent(coalesce(name, '') || ' ' || coalesce(description, '')))
  ) stored;

create index companies_search_tsv_idx      on public.companies      using gin (search_tsv);
create index products_search_tsv_idx       on public.products       using gin (search_tsv);
create index services_search_tsv_idx       on public.services       using gin (search_tsv);
create index projects_search_tsv_idx       on public.projects       using gin (search_tsv);
create index opportunities_search_tsv_idx  on public.opportunities  using gin (search_tsv);

-- ── RPC: cross-entity search ─────────────────────────────────────────────

create or replace function public.search_all(p_query text)
returns table (
  entity       text,
  id           uuid,
  title        text,
  description  text,
  company_id   uuid,
  company_name text,
  company_slug text,
  rank         real,
  created_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q tsquery;
begin
  if p_query is null or btrim(p_query) = '' then
    return;
  end if;
  q := websearch_to_tsquery('spanish', public.fold_accent(p_query));
  return query
    select * from (
      -- companies: base tsvector + sector + territory.
      select 'company'::text as entity,
             c.id,
             coalesce(c.display_name, c.legal_name) as title,
             c.description,
             c.id as company_id,
             coalesce(c.display_name, c.legal_name) as company_name,
             c.slug as company_slug,
             ts_rank(c.search_tsv, q) as rank,
             c.created_at
      from public.companies c
      where c.status = 'approved'
        and (
          c.search_tsv @@ q
          or exists (select 1 from public.company_sectors cs
                     join public.sectors s on s.id = cs.sector_id
                     where cs.company_id = c.id
                       and to_tsvector('spanish', public.fold_accent(s.name)) @@ q)
          or exists (select 1 from public.provinces pv
                     where pv.id = c.province_id
                       and to_tsvector('spanish', public.fold_accent(pv.name)) @@ q)
          or exists (select 1 from public.municipalities mu
                     where mu.id = c.municipality_id
                       and mu.province_id = c.province_id
                       and to_tsvector('spanish', public.fold_accent(mu.name)) @@ q)
        )

      union all

      -- products / services / projects / opportunities: base tsvector + tags.
      select 'product'::text,
             p.id, p.name, p.description,
             p.company_id, coalesce(co.display_name, co.legal_name), co.slug,
             ts_rank(p.search_tsv, q), p.created_at
      from public.products p
      join public.companies co on co.id = p.company_id
      where public.is_company_content_public(p.company_id)
        and not p.is_hidden
        and (
          p.search_tsv @@ q
          or exists (select 1 from public.content_tags ct
                     join public.tags t on t.id = ct.tag_id
                     where ct.content_type = 'product' and ct.content_id = p.id
                       and to_tsvector('spanish', public.fold_accent(t.name)) @@ q)
        )

      union all

      select 'service'::text,
             s.id, s.name, s.description,
             s.company_id, coalesce(co.display_name, co.legal_name), co.slug,
             ts_rank(s.search_tsv, q), s.created_at
      from public.services s
      join public.companies co on co.id = s.company_id
      where public.is_company_content_public(s.company_id)
        and not s.is_hidden
        and (
          s.search_tsv @@ q
          or exists (select 1 from public.content_tags ct
                     join public.tags t on t.id = ct.tag_id
                     where ct.content_type = 'service' and ct.content_id = s.id
                       and to_tsvector('spanish', public.fold_accent(t.name)) @@ q)
        )

      union all

      select 'project'::text,
             pj.id, pj.name, pj.description,
             pj.company_id, coalesce(co.display_name, co.legal_name), co.slug,
             ts_rank(pj.search_tsv, q), pj.created_at
      from public.projects pj
      join public.companies co on co.id = pj.company_id
      where public.is_company_content_public(pj.company_id)
        and not pj.is_hidden
        and (
          pj.search_tsv @@ q
          or exists (select 1 from public.content_tags ct
                     join public.tags t on t.id = ct.tag_id
                     where ct.content_type = 'project' and ct.content_id = pj.id
                       and to_tsvector('spanish', public.fold_accent(t.name)) @@ q)
        )

      union all

      select 'opportunity'::text,
             o.id, o.name, o.description,
             o.company_id, coalesce(co.display_name, co.legal_name), co.slug,
             ts_rank(o.search_tsv, q), o.created_at
      from public.opportunities o
      join public.companies co on co.id = o.company_id
      where public.is_company_content_public(o.company_id)
        and not o.is_hidden
        and (
          o.search_tsv @@ q
          or exists (select 1 from public.content_tags ct
                     join public.tags t on t.id = ct.tag_id
                     where ct.content_type = 'opportunity' and ct.content_id = o.id
                       and to_tsvector('spanish', public.fold_accent(t.name)) @@ q)
        )
    ) results
    order by rank desc, created_at desc;
end;
$$;

revoke execute on function public.search_all(text) from public;
grant execute on function public.search_all(text) to anon, authenticated;

commit;
