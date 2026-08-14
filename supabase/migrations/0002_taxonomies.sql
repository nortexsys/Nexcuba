-- 0002 · Taxonomies (hybrid: controlled taxonomy + free tags). Design.md §2.
-- Initial seed is PO-reviewable and editable from the backoffice (dependency D-4).

begin;

create table public.sectors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text generated always as (public.slugify(name)) stored unique,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.category_scope as enum ('product', 'service');

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  scope      public.category_scope not null,
  name       text not null,
  slug       text generated always as (public.slugify(name)) stored,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, slug)
);

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text generated always as (public.slugify(name)) stored unique,
  created_at timestamptz not null default now()
);

create table public.company_sectors (
  company_id uuid not null,
  sector_id  uuid not null references public.sectors (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, sector_id)
);

create index company_sectors_sector_idx on public.company_sectors (sector_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sectors_touch before update on public.sectors
  for each row execute function public.touch_updated_at();
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- ── Initial seed (D-4: editable from backoffice; PO reviews during build) ──

insert into public.sectors (name, sort_order) values
  ('Agricultura y Ganadería', 10),
  ('Alimentación y Bebidas', 20),
  ('Comercio y Distribución', 30),
  ('Construcción y Materiales', 40),
  ('Cultura, Deporte y Recreación', 50),
  ('Ciencia, Tecnología e Innovación', 60),
  ('Educación y Formación', 70),
  ('Energía y Minas', 80),
  ('Forestal, Papel e Industrias Ligeras', 90),
  ('Informática y Telecomunicaciones', 100),
  ('Industria Sideromecánica y Reciclaje', 110),
  ('Logística y Transporte', 120),
  ('Pesca y Acuicultura', 130),
  ('Salud y Biotecnología', 140),
  ('Servicios Gastronómicos', 150),
  ('Servicios Personales', 160),
  ('Servicios Profesionales y Técnicos', 170),
  ('Textil, Confección y Calzado', 180),
  ('Turismo y Hospitalidad', 190),
  ('Comunicación y Marketing', 200);

insert into public.categories (scope, name, sort_order) values
  ('product', 'Alimentos y Bebidas', 10),
  ('product', 'Productos Agrícolas', 20),
  ('product', 'Textil y Confección', 30),
  ('product', 'Calzado', 40),
  ('product', 'Muebles y Hogar', 50),
  ('product', 'Electrónica y Electrodomésticos', 60),
  ('product', 'Construcción y Ferretería', 70),
  ('product', 'Insumos Agropecuarios', 80),
  ('product', 'Papelería y Oficina', 90),
  ('product', 'Salud e Higiene', 100),
  ('product', 'Juguetes y Artículos Deportivos', 110),
  ('product', 'Productos Químicos', 120),
  ('product', 'Envases y Embalajes', 130),
  ('product', 'Artesanía', 140),
  ('product', 'Otros Productos', 150),
  ('service', 'Servicios Técnicos Especializados', 10),
  ('service', 'Consultoría y Asesoría', 20),
  ('service', 'Diseño, Publicidad y Marketing', 30),
  ('service', 'Transporte y Logística', 40),
  ('service', 'Alojamiento y Gastronomía', 50),
  ('service', 'Mantenimiento y Reparación', 60),
  ('service', 'Informática y Desarrollo de Software', 70),
  ('service', 'Educación y Capacitación', 80),
  ('service', 'Organización de Eventos', 90),
  ('service', 'Belleza y Cuidado Personal', 100),
  ('service', 'Servicios Legales y Contables', 110),
  ('service', 'Ingeniería y Arquitectura', 120),
  ('service', 'Servicios de Construcción', 130),
  ('service', 'Fotografía y Audiovisual', 140),
  ('service', 'Otros Servicios', 150);

grant select on
  public.sectors, public.categories, public.tags, public.company_sectors
to anon, authenticated, service_role;
grant insert, update, delete on
  public.sectors, public.categories, public.tags
to authenticated, service_role;

commit;
