-- 0006 · Row Level Security — the full matrix of design.md §4.
-- Every "the server rejects" scenario in the capability specs maps to a test
-- in tests/db/rls.test.sql.

begin;

-- ── companies ────────────────────────────────────────────────────────────────
-- SELECT public: approved rows only (a pending/rejected company is invisible).
alter table public.companies enable row level security;

create policy companies_select_public on public.companies
  for select to anon, authenticated
  using (status = 'approved');

create policy companies_select_owner on public.companies
  for select to authenticated
  using (id = public.own_company_id());

create policy companies_select_admin on public.companies
  for select to authenticated
  using (public.is_admin());

-- INSERT/DELETE happen through the service-role registration/approval
-- transaction: no anon/authenticated policies exist (default deny).
-- UPDATE: owner may edit profile columns (privileged columns guarded by
-- trigger); admin may edit everything.
create policy companies_update_owner on public.companies
  for update to authenticated
  using (id = public.own_company_id())
  with check (id = public.own_company_id());

create policy companies_update_admin on public.companies
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy companies_delete_admin on public.companies
  for delete to authenticated
  using (public.is_admin());

-- ── profiles ─────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── registration_applications / verification_documents (admin only) ─────────
alter table public.registration_applications enable row level security;
alter table public.verification_documents enable row level security;

create policy registration_applications_admin on public.registration_applications
  for select to authenticated using (public.is_admin());
create policy registration_applications_admin_upd on public.registration_applications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy verification_documents_admin on public.verification_documents
  for select to authenticated using (public.is_admin());

-- ── content: products / services / projects / opportunities ─────────────────
-- Public SELECT: approved company + active publishing right (cuban or
-- premium) + not admin-hidden. Owner and admin see their own / everything.
alter table public.products      enable row level security;
alter table public.services      enable row level security;
alter table public.projects      enable row level security;
alter table public.opportunities enable row level security;

create policy products_select_public on public.products
  for select to anon, authenticated
  using (not is_hidden and public.is_company_content_public(company_id));
create policy products_select_owner on public.products
  for select to authenticated
  using (company_id = public.own_company_id() or public.is_admin());

create policy services_select_public on public.services
  for select to anon, authenticated
  using (not is_hidden and public.is_company_content_public(company_id));
create policy services_select_owner on public.services
  for select to authenticated
  using (company_id = public.own_company_id() or public.is_admin());

create policy projects_select_public on public.projects
  for select to anon, authenticated
  using (not is_hidden and public.is_company_content_public(company_id));
create policy projects_select_owner on public.projects
  for select to authenticated
  using (company_id = public.own_company_id() or public.is_admin());

create policy opportunities_select_public on public.opportunities
  for select to anon, authenticated
  using (not is_hidden and public.is_company_content_public(company_id));
create policy opportunities_select_owner on public.opportunities
  for select to authenticated
  using (company_id = public.own_company_id() or public.is_admin());

-- INSERT: only own company and only with the publishing right (FREE foreign
-- rejected at the database boundary).
create policy products_insert_owner on public.products
  for insert to authenticated
  with check (company_id = public.own_company_id() and public.own_can_publish());
create policy services_insert_owner on public.services
  for insert to authenticated
  with check (company_id = public.own_company_id() and public.own_can_publish());
create policy projects_insert_owner on public.projects
  for insert to authenticated
  with check (company_id = public.own_company_id() and public.own_can_publish());
create policy opportunities_insert_owner on public.opportunities
  for insert to authenticated
  with check (company_id = public.own_company_id() and public.own_can_publish());

create policy products_update_owner on public.products
  for update to authenticated
  using (company_id = public.own_company_id() or public.is_admin())
  with check (company_id = public.own_company_id() or public.is_admin());
create policy services_update_owner on public.services
  for update to authenticated
  using (company_id = public.own_company_id() or public.is_admin())
  with check (company_id = public.own_company_id() or public.is_admin());
create policy projects_update_owner on public.projects
  for update to authenticated
  using (company_id = public.own_company_id() or public.is_admin())
  with check (company_id = public.own_company_id() or public.is_admin());
create policy opportunities_update_owner on public.opportunities
  for update to authenticated
  using (company_id = public.own_company_id() or public.is_admin())
  with check (company_id = public.own_company_id() or public.is_admin());

create policy products_delete_owner on public.products
  for delete to authenticated
  using (company_id = public.own_company_id() or public.is_admin());
create policy services_delete_owner on public.services
  for delete to authenticated
  using (company_id = public.own_company_id() or public.is_admin());
create policy projects_delete_owner on public.projects
  for delete to authenticated
  using (company_id = public.own_company_id() or public.is_admin());
create policy opportunities_delete_owner on public.opportunities
  for delete to authenticated
  using (company_id = public.own_company_id() or public.is_admin());

-- ── company_sectors ──────────────────────────────────────────────────────────
alter table public.company_sectors enable row level security;

create policy company_sectors_select on public.company_sectors
  for select to anon, authenticated
  using (
    exists (select 1 from public.companies c
            where c.id = company_sectors.company_id and c.status = 'approved')
    or company_sectors.company_id = public.own_company_id()
    or public.is_admin()
  );

create policy company_sectors_write on public.company_sectors
  for all to authenticated
  using (company_id = public.own_company_id() or public.is_admin())
  with check (company_id = public.own_company_id() or public.is_admin());

-- ── taxonomies: admin CUD, everyone reads active rows ────────────────────────
alter table public.sectors     enable row level security;
alter table public.categories  enable row level security;
alter table public.tags        enable row level security;

create policy sectors_select on public.sectors
  for select to anon, authenticated using (is_active or public.is_admin());
create policy sectors_admin on public.sectors
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy categories_select on public.categories
  for select to anon, authenticated using (is_active or public.is_admin());
create policy categories_admin on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy tags_select on public.tags
  for select to anon, authenticated using (true);
create policy tags_admin on public.tags
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── images: visible when their entity is public; owner manages ──────────────
alter table public.images enable row level security;

create policy images_select on public.images
  for select to anon, authenticated
  using (
    public.is_entity_public(owner_type, owner_id)
    or public.owns_entity(owner_type, owner_id)
    or public.is_admin()
  );

create policy images_write_owner on public.images
  for all to authenticated
  using (public.owns_entity(owner_type, owner_id) or public.is_admin())
  with check (public.owns_entity(owner_type, owner_id) or public.is_admin());

-- ── content_tags: follow the same visibility/ownership as content ────────────
alter table public.content_tags enable row level security;

create policy content_tags_select on public.content_tags
  for select to anon, authenticated
  using (
    public.is_entity_public(content_type, content_id)
    or public.owns_entity(content_type, content_id)
    or public.is_admin()
  );

create policy content_tags_write on public.content_tags
  for all to authenticated
  using (public.owns_entity(content_type, content_id) or public.is_admin())
  with check (public.owns_entity(content_type, content_id) or public.is_admin());

-- ── contact_requests ─────────────────────────────────────────────────────────
alter table public.contact_requests enable row level security;

create policy contact_requests_select on public.contact_requests
  for select to authenticated
  using (
    requester_company_id = public.own_company_id()
    or target_company_id = public.own_company_id()
    or public.is_admin()
  );

create policy contact_requests_insert on public.contact_requests
  for insert to authenticated
  with check (requester_company_id = public.own_company_id() and public.own_can_network());

create policy contact_requests_update_target on public.contact_requests
  for update to authenticated
  using (target_company_id = public.own_company_id() or public.is_admin())
  with check (target_company_id = public.own_company_id() or public.is_admin());

-- ── notifications: owner reads/marks-read; created by system (service role) ──
alter table public.notifications enable row level security;

create policy notifications_owner on public.notifications
  for select to authenticated
  using (profile_id = auth.uid());

create policy notifications_mark_read on public.notifications
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ── audit_log: admin reads/writes; nobody updates or deletes ────────────────
alter table public.audit_log enable row level security;

create policy audit_log_select_admin on public.audit_log
  for select to authenticated using (public.is_admin());
create policy audit_log_insert_admin on public.audit_log
  for insert to authenticated with check (public.is_admin());

-- ── crm_records: strictly internal (admin only, invisible to companies) ──────
alter table public.crm_records enable row level security;

create policy crm_admin_all on public.crm_records
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- service_role has BYPASSRLS on Supabase: no policies needed for it.

commit;
