-- Full-text search test suite (H7, migration 0011).
-- Covers the `search_all` RPC: cross-entity grouping, name/description
-- matching, sector/territory/tag extensions, unaccent, visibility rules
-- (approved only, no hidden content, no foreign-free content) and the
-- default created_at DESC ordering.

-- ══════════════════════════ FIXTURES ══════════════════════════

insert into public.companies (id, legal_name, entity_type, status,
                              description, province_id, municipality_id, created_at) values
  ('14000000-0000-4000-d000-00000000000a', 'Café Habana', 'mipyme', 'approved',
   'Tueste artesanal de café de montaña.',
   (select id from public.provinces where name = 'La Habana'),
   (select id from public.municipalities where name = 'Centro Habana'),
   '2024-01-15'),
  ('14000000-0000-4000-d000-00000000000b', 'Café del Sur', 'mipyme', 'approved',
   null,
   (select id from public.provinces where name = 'Matanzas'),
   (select id from public.municipalities where name = 'Matanzas'),
   '2024-02-20'),
  ('14000000-0000-4000-d000-00000000000c', 'Café Pendiente', 'mipyme', 'pending', null, null, null, now()),
  ('14000000-0000-4000-d000-00000000000d', 'Café Rechazado', 'mipyme', 'rejected', null, null, null, now()),
  ('14000000-0000-4000-d000-00000000000e', 'Foránea Libre', 'foreign', 'approved', null, null, null, now()),
  ('14000000-0000-4000-d000-00000000000f', 'Café Duplicado', 'mipyme', 'approved', null, null, null, '2024-03-01'),
  ('14000000-0000-4000-d000-000000000010', 'Café Duplicado', 'mipyme', 'approved', null, null, null, '2024-06-01');

insert into public.company_sectors (company_id, sector_id)
  select '14000000-0000-4000-d000-00000000000a', id from public.sectors
  where name = 'Servicios Gastronómicos';

insert into public.products (id, company_id, name, description, is_hidden, created_at) values
  ('14100000-0000-4000-d000-00000000000a', '14000000-0000-4000-d000-00000000000a',
   'Café de especialidad', 'Granos seleccionados de altura.', false, '2024-03-01'),
  ('14100000-0000-4000-d000-00000000000b', '14000000-0000-4000-d000-00000000000a',
   'Café indescifrable', 'Invisible para el público.', true, '2024-03-02');

insert into public.services (id, company_id, name, created_at) values
  ('14200000-0000-4000-d000-00000000000a', '14000000-0000-4000-d000-00000000000a',
   'Catación de café', '2024-03-03');

insert into public.projects (id, company_id, name, created_at) values
  ('14300000-0000-4000-d000-00000000000a', '14000000-0000-4000-d000-00000000000a',
   'Proyecto café orgánico', '2024-03-04');

insert into public.opportunities (id, company_id, name, opportunity_type, created_at) values
  ('14400000-0000-4000-d000-00000000000a', '14000000-0000-4000-d000-00000000000a',
   'Busco proveedor de café', 'proveedor', '2024-03-05');

-- Foreign-free company content must stay invisible (approved but no premium).
insert into public.products (id, company_id, name, created_at) values
  ('14100000-0000-4000-d000-00000000000c', '14000000-0000-4000-d000-00000000000e',
   'Café importado', '2024-03-06');

-- Tag extension: match by tag even though name/description do not contain it.
insert into public.tags (name) values ('Ecoturismo');
insert into public.content_tags (content_type, content_id, tag_id)
  select 'product', '14100000-0000-4000-d000-00000000000a', id from public.tags
  where name = 'Ecoturismo';

-- ══════════════════════════ ASSERTIONS ══════════════════════════

-- Guards: empty / whitespace / NULL query → no rows.
select assert.ok(
  (select count(*) from public.search_all('')) = 0, 'search: query vacía → 0');
select assert.ok(
  (select count(*) from public.search_all('   ')) = 0, 'search: query con espacios → 0');
select assert.ok(
  (select count(*) from public.search_all(null)) = 0, 'search: query NULL → 0');

-- Cross-entity grouping: "café" hits all 5 entities within our fixture range.
select assert.ok(
  (select count(*) from public.search_all('cafe')
    where id in ('14000000-0000-4000-d000-00000000000a',
                 '14000000-0000-4000-d000-00000000000b',
                 '14000000-0000-4000-d000-00000000000f',
                 '14000000-0000-4000-d000-000000000010',
                 '14100000-0000-4000-d000-00000000000a',
                 '14200000-0000-4000-d000-00000000000a',
                 '14300000-0000-4000-d000-00000000000a',
                 '14400000-0000-4000-d000-00000000000a')) = 8,
  'search: "cafe" → 8 filas en nuestro rango (5 entidades)');

select assert.ok(
  (select count(*) from public.search_all('cafe') where entity = 'company'
     and id::text like '14000000-%') = 4,
  'search: "cafe" → 4 empresas visibles (pending/rejected excluidas)');
select assert.ok(
  (select count(*) from public.search_all('cafe') where entity = 'product'
     and id::text like '14100000-%') = 1,
  'search: "cafe" → 1 producto visible (hidden y foreign-free excluidos)');
select assert.ok(
  (select count(*) from public.search_all('cafe') where entity = 'service') = 1,
  'search: "cafe" → 1 servicio');
select assert.ok(
  (select count(*) from public.search_all('cafe') where entity = 'project') = 1,
  'search: "cafe" → 1 proyecto');
select assert.ok(
  (select count(*) from public.search_all('cafe') where entity = 'opportunity') = 1,
  'search: "cafe" → 1 oportunidad');
select assert.ok(
  (select count(distinct entity) from public.search_all('cafe')) = 5,
  'search: "cafe" agrupa las 5 entidades');

-- Unaccent: "montaña" ↔ "montana".
select assert.ok(
  (select count(*) from public.search_all('montana') where id::text like '14000000-%') = 1,
  'search: "montana" encuentra la descripción acentuada');
select assert.ok(
  (select count(*) from public.search_all('montaña') where id::text like '14000000-%') = 1,
  'search: "montaña" (con acento) da el mismo resultado');

-- Multi-word AND query narrows the result.
select assert.ok(
  (select count(*) from public.search_all('cafe habana')) = 1
  and (select id from public.search_all('cafe habana')) = '14000000-0000-4000-d000-00000000000a',
  'search: "cafe habana" → solo Café Habana');

-- Sector extension: match via sector tsvector.
select assert.ok(
  (select count(*) from public.search_all('gastronomico')) = 1
  and (select id from public.search_all('gastronomico')) = '14000000-0000-4000-d000-00000000000a',
  'search: "gastronomico" encuentra por sector (sin acento)');

-- Territory extension: match via province/municipality even when the name
-- does not contain the term.
select assert.ok(
  (select count(*) from public.search_all('matanzas')) = 1
  and (select id from public.search_all('matanzas')) = '14000000-0000-4000-d000-00000000000b',
  'search: "matanzas" encuentra por territorio');

-- Tag extension: match via content_tags → tags.
select assert.ok(
  (select count(*) from public.search_all('ecoturismo')) = 1
  and (select id from public.search_all('ecoturismo')) = '14100000-0000-4000-d000-00000000000a'
  and (select entity from public.search_all('ecoturismo')) = 'product',
  'search: "ecoturismo" encuentra por etiqueta');

-- Content rows carry the owning company's name + slug.
select assert.ok(
  (select company_name from public.search_all('ecoturismo')) = 'Café Habana'
  and (select company_slug from public.search_all('ecoturismo')) = 'cafe-habana',
  'search: la fila de contenido trae nombre y slug de la empresa');

-- Visibility: pending/rejected companies never surface.
select assert.ok(
  (select count(*) from public.search_all('pendiente')) = 0, 'search: empresa pending excluida');
select assert.ok(
  (select count(*) from public.search_all('rechazado')) = 0, 'search: empresa rejected excluida');

-- Visibility: hidden content and foreign-free content never surface.
select assert.ok(
  (select count(*) from public.search_all('indescifrable')) = 0, 'search: contenido hidden excluido');
select assert.ok(
  (select count(*) from public.search_all('importado')) = 0,
  'search: contenido de empresa foreign sin premium excluido');

-- Default ordering: created_at DESC among equal-relevance rows.
select assert.ok(
  (select count(*) from public.search_all('duplicado')) = 2
  and (select id from public.search_all('duplicado') limit 1)
      = '14000000-0000-4000-d000-000000000010',
  'search: mismo rank → la más reciente primero (created_at DESC)');

-- The RPC is granted to anon (REST role).
set role anon;
select assert.ok(
  (select count(*) from public.search_all('cafe')) >= 8,
  'search: anon puede ejecutar search_all');
reset role;

select assert.finish();
