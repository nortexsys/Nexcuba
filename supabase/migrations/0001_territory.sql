-- 0001 · Territory foundation
-- Cuban official structure: 15 provinces + Isla de la Juventud (special
-- municipality) and its 168 municipalities. Design.md §2 (territorial seed).

begin;

create schema if not exists public;

-- Accent/case-safe slug generation (no unaccent dependency).
create or replace function public.slugify(raw text)
returns text
language sql
immutable
strict
as $$
  select trim(
    both '-' from
    regexp_replace(
      translate(
        lower(raw),
        'áàäâéèëêíìïîóòöôúùüûñç',
        'aaaaeeeeiiiioooouuuunc'
      ),
      '[^a-z0-9]+', '-', 'g'
    )
  );
$$;

create table public.provinces (
  id         smallint generated always as identity primary key,
  name       text not null unique,
  slug       text generated always as (public.slugify(name)) stored unique,
  created_at timestamptz not null default now()
);

create table public.municipalities (
  id          smallint generated always as identity primary key,
  province_id smallint not null references public.provinces (id) on delete restrict,
  name        text not null,
  slug        text generated always as (public.slugify(name)) stored,
  created_at  timestamptz not null default now(),
  unique (province_id, slug),
  unique (id, province_id)  -- target for the composite FK from companies
);

create index municipalities_province_idx on public.municipalities (province_id);

insert into public.provinces (name) values
  ('Pinar del Río'),
  ('Artemisa'),
  ('La Habana'),
  ('Mayabeque'),
  ('Matanzas'),
  ('Villa Clara'),
  ('Cienfuegos'),
  ('Sancti Spíritus'),
  ('Ciego de Ávila'),
  ('Camagüey'),
  ('Las Tunas'),
  ('Holguín'),
  ('Granma'),
  ('Santiago de Cuba'),
  ('Guantánamo'),
  ('Isla de la Juventud');

insert into public.municipalities (province_id, name) values
  -- 1 · Pinar del Río (11)
  (1, 'Pinar del Río'), (1, 'Consolación del Sur'), (1, 'Los Palacios'),
  (1, 'Sandino'), (1, 'Minas de Matahambre'), (1, 'Mantua'), (1, 'Viñales'),
  (1, 'Guane'), (1, 'San Juan y Martínez'), (1, 'San Luis'), (1, 'La Palma'),
  -- 2 · Artemisa (11)
  (2, 'Artemisa'), (2, 'Bahía Honda'), (2, 'Candelaria'), (2, 'Caimito'),
  (2, 'Guanajay'), (2, 'Güira de Melena'), (2, 'Mariel'), (2, 'Bauta'),
  (2, 'San Antonio de los Baños'), (2, 'San Cristóbal'), (2, 'Alquízar'),
  -- 3 · La Habana (15)
  (3, 'Playa'), (3, 'Plaza de la Revolución'), (3, 'Centro Habana'),
  (3, 'Cerro'), (3, 'La Lisa'), (3, 'Marianao'), (3, 'Diez de Octubre'),
  (3, 'Guanabacoa'), (3, 'Regla'), (3, 'Habana del Este'), (3, 'Boyeros'),
  (3, 'Arroyo Naranjo'), (3, 'San Miguel del Padrón'), (3, 'Cotorro'),
  (3, 'Habana Vieja'),
  -- 4 · Mayabeque (11)
  (4, 'San José de las Lajas'), (4, 'Bejucal'), (4, 'Jaruco'),
  (4, 'Santa Cruz del Norte'), (4, 'Madruga'), (4, 'Nueva Paz'),
  (4, 'San Nicolás'), (4, 'Güines'), (4, 'Melena del Sur'), (4, 'Batabanó'),
  (4, 'Quivicán'),
  -- 5 · Matanzas (13)
  (5, 'Matanzas'), (5, 'Cárdenas'), (5, 'Martí'), (5, 'Colón'), (5, 'Perico'),
  (5, 'Jovellanos'), (5, 'Pedro Betancourt'), (5, 'Limonar'),
  (5, 'Jagüey Grande'), (5, 'Ciénaga de Zapata'), (5, 'Calimete'),
  (5, 'Los Arabos'), (5, 'Unión de Reyes'),
  -- 6 · Villa Clara (13)
  (6, 'Santa Clara'), (6, 'Placetas'), (6, 'Camajuani'), (6, 'Remedios'),
  (6, 'Caibarién'), (6, 'Sagua la Grande'), (6, 'Cifuentes'),
  (6, 'Encrucijada'), (6, 'Manicaragua'), (6, 'Ranchuelo'),
  (6, 'Santo Domingo'), (6, 'Corralillo'), (6, 'Quemado de Güines'),
  -- 7 · Cienfuegos (8)
  (7, 'Cienfuegos'), (7, 'Cruces'), (7, 'Cumanayagua'), (7, 'Palmira'),
  (7, 'Rodas'), (7, 'Abreus'), (7, 'Aguada de Pasajeros'), (7, 'Lajas'),
  -- 8 · Sancti Spíritus (8)
  (8, 'Sancti Spíritus'), (8, 'Trinidad'), (8, 'Cabaiguán'), (8, 'Yaguajay'),
  (8, 'Jatibonico'), (8, 'Taguasco'), (8, 'La Sierpe'), (8, 'Fomento'),
  -- 9 · Ciego de Ávila (10)
  (9, 'Ciego de Ávila'), (9, 'Morón'), (9, 'Chambas'), (9, 'Bolivia'),
  (9, 'Primero de Enero'), (9, 'Ciro Redondo'), (9, 'Florencia'),
  (9, 'Majagua'), (9, 'Venezuela'), (9, 'Baraguá'),
  -- 10 · Camagüey (13)
  (10, 'Camagüey'), (10, 'Florida'), (10, 'Nuevitas'), (10, 'Guáimaro'),
  (10, 'Sibanicú'), (10, 'Esmeralda'), (10, 'Minas'), (10, 'Vertientes'),
  (10, 'Santa Cruz del Sur'), (10, 'Najasa'), (10, 'Céspedes'),
  (10, 'Jimaguayú'), (10, 'Sierra de Cubitas'),
  -- 11 · Las Tunas (8)
  (11, 'Las Tunas'), (11, 'Puerto Padre'), (11, 'Amancio'), (11, 'Jobabo'),
  (11, 'Colombia'), (11, 'Majibacoa'), (11, 'Jesús Menéndez'), (11, 'Manatí'),
  -- 12 · Holguín (14)
  (12, 'Holguín'), (12, 'Banes'), (12, 'Antilla'), (12, 'Báguanos'),
  (12, 'Calixto García'), (12, 'Cacocum'), (12, 'Cueto'), (12, 'Frank País'),
  (12, 'Gibara'), (12, 'Mayarí'), (12, 'Moa'), (12, 'Rafael Freyre'),
  (12, 'Sagua de Tánamo'), (12, 'Urbano Noris'),
  -- 13 · Granma (13)
  (13, 'Bayamo'), (13, 'Bartolomé Masó'), (13, 'Buey Arriba'),
  (13, 'Campechuela'), (13, 'Cauto Cristo'), (13, 'Guisa'), (13, 'Jiguaní'),
  (13, 'Manzanillo'), (13, 'Media Luna'), (13, 'Niquero'), (13, 'Pilón'),
  (13, 'Río Cauto'), (13, 'Yara'),
  -- 14 · Santiago de Cuba (9)
  (14, 'Santiago de Cuba'), (14, 'Palma Soriano'), (14, 'Contramaestre'),
  (14, 'San Luis'), (14, 'Segundo Frente'), (14, 'Songo-La Maya'),
  (14, 'Mella'), (14, 'Guamá'), (14, 'Tercer Frente'),
  -- 15 · Guantánamo (10)
  (15, 'Guantánamo'), (15, 'Baracoa'), (15, 'Caimanera'), (15, 'El Salvador'),
  (15, 'Imías'), (15, 'Maisí'), (15, 'Manuel Tames'), (15, 'Niceto Pérez'),
  (15, 'San Antonio del Sur'), (15, 'Yateras'),
  -- 16 · Isla de la Juventud (1)
  (16, 'Isla de la Juventud');

-- Read access for API roles (matches on Supabase; harmless in plain PG).
grant usage on schema public to anon, authenticated, service_role;
grant select on public.provinces, public.municipalities to anon, authenticated, service_role;

commit;
