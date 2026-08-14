# Spec de Diseño para la web nexcuba— Referencia MarketB2B (readdy.cc)

> Fuente: análisis del preview `readdy.cc/preview/1d87d2b7.../7889295` (6 páginas: Home, Panel, Productos, Servicios, Empresas, Foro).
> Capturas de referencia en `docs/design-referencia-marketb2b/`.
> Valores extraídos de los estilos computados reales del sitio (no aproximaciones visuales), viewport desktop 1440px.

---

## 1. Identidad general

- **Estilo**: editorial premium minimalista. Monocromo (grises + negro casi puro) sobre fondos blancos y cremas cálidos, con un único acento dorado. Sin sombras; profundidad mediante bordes sutiles y fondos tenues.
- **Framework**: Tailwind CSS (contenedor `max-w-7xl mx-auto` = 1280px, escala de grises Tailwind estándar).
- **Tipografía**: `Plus Jakarta Sans`, fallback `Inter`, `sans-serif`. Base 16px/400.
- **Radios**: tarjetas `16px`; botones, badges y chips en píldora completa (`border-radius: 9999px`).
- **Sombras**: ninguna (flat design). Las tarjetas usan borde `0.8px solid #F3F4F6`.

## 2. Tokens de color (valores exactos)

| Rol | Hex | Notas |
|---|---|---|
| Tinta principal (headings, botón primario) | `#111827` | gray-900 |
| Tinta oscura hero / secciones premium | `#1A1A1A` y `#0A0A0A` | casi negro puro |
| Texto cuerpo | `#374151` | gray-700 |
| Texto secundario | `#4B5563` | gray-600 |
| Texto terciario / meta | `#6B7280` | gray-500 |
| Texto atenuado (fechas, placeholders) | `#9CA3AF` | gray-400 |
| Bordes sutiles | `#D1D5DB` / `#E5E7EB` | gray-300 / 200 |
| Borde tarjeta | `#F3F4F6` | gray-100, 0.8px |
| **Acento dorado** (hero oscuro, badges premium) | `#E8C98A` | único color de marca saturado |
| Fondo crema página/footer | `#F5F4F1` / `#F8F6F3` | cálidos |
| Fondos tenues de stat-cards | `#F8F7F5`, `#F0EBE4`, `#E8EDE8`, `#EDE8E8` | tintes neutros diferenciados por tarjeta |
| Blanco | `#FFFFFF` | tarjetas, botón CTA sobre hero oscuro |

Sobre el hero oscuro se usa texto blanco con opacidades: `rgba(255,255,255,0.9)` (títulos), `0.7`, `0.6`, `0.5` (jerarquía descendente) y superficies `rgba(255,255,255,0.1)`.

## 3. Tipografía

| Elemento | Tamaño | Peso | Extras |
|---|---|---|---|
| H1 hero (home) | 72px | 800 | `line-height: 72px`, `letter-spacing: -1.8px`, blanco |
| H1 de página interior | 36px | 800 | `#111827` |
| H2 sección | ~28px | 700 | |
| H3 título de tarjeta/artículo | ~18px | 600 | |
| Subtítulo página | 14–16px | 400 | `#9CA3AF` |
| Body | 16px | 400 | |
| Botones | 14px (sm) / 16px (lg) | 500–600 | |
| Meta/fechas/tags | 12–14px | 400–500 | |

## 4. Layout y estructura global

- **Contenedor**: `max-w-7xl` (1280px) centrado, padding lateral 24px.
- **Header** (sticky, blanco, borde inferior sutil):
  - Izquierda: logo (icono + wordmark `MarketB2B`, tinta oscura).
  - Centro: nav con 5 enlaces (Mi Panel, Productos, Servicios, Empresas, Foro), 16px/400, hover gris.
  - Derecha: botón fantasma "Iniciar Sesión" (transparente, texto `#374151`, pill, `8px 16px`) + botón oscuro "Registrar Empresa" (`#111827`, texto blanco, pill, `12px 24px`).
- **Footer** (fondo crema `#F5F4F1`):
  - 4 columnas: marca + descripción + iconos sociales / Plataforma / Empresa (Sobre Nosotros, Cómo Funciona, Precios, Blog, Contacto, Términos, Privacidad) / enlaces legales.
  - Línea final: © 2025 + Privacidad | Términos | Cookies.

## 5. Componentes clave

### Botones
- **Primario (oscuro)**: fondo `#111827`, texto blanco, pill 9999px, `12px 24px` (sm) o `16px 32px` (lg), 14–16px/500–600. Sin borde ni sombra.
- **CTA invertido (sobre hero oscuro)**: fondo blanco, texto `#111827`, pill, `16px 32px`, 16px/600.
- **Fantasma**: transparente, texto `#374151`, pill.
- **Botón de categoría/filtro**: blanco, texto `#374151`, pill, `8px 16px`, 14px/400; estado activo → fondo `#111827` texto blanco.

### Tarjetas (base)
- Fondo blanco, `border-radius: 16px`, `border: 0.8px solid #F3F4F6`, `padding: 24px`, sin sombra.
- Hover típico: borde ligeramente más oscuro.

### Stat-cards del panel
- Grid 3 columnas. Cada tarjeta con fondo tenue distinto (`#F8F7F5`, `#F0EBE4`, `#E8EDE8`), etiqueta 14px gris, número grande (32–36px/700–800), badge de tendencia tipo "+3 este mes" (12px, verde/gris).
- Fila superior del panel: saludo "Bienvenido de nuevo," (gris) + nombre empresa (H1 36px/800) + "Última conexión…" (gris claro) y a la derecha botones Notificaciones (con badge contador rojo) y Nueva Publicación (oscuro).

### Acciones rápidas
- Grid 4 columnas de enlaces-tarjeta: icono, título, fondo crema, radius 16px.

### Cards de producto (página Productos)
- Grid 3–4 columnas. Zona de imagen superior (placeholder gris/crema), badge "Verificado" (pill pequeño), título 18px/600, metadatos (empresa · ubicación) 12–14px gris, precio en 20px/700 tinta oscura, botón "Solicutar Cotización" fantasma/pill.
- Barra lateral de filtros: categorías como lista con contadores + sliders/badges de precio; chips pill seleccionables.

### Cards de servicio (página Servicios)
- Variante horizontal: icono o imagen a la izquierda, contenido a la derecha, precio/duración, botón pill.

### Cards de empresa (página Empresas)
- Logo (cuadrado redondeado), nombre + badge "Verificada" (pill con check), sector, ubicación, descripción de 2 líneas, stats (productos, servicios, empleados), botón "Ver Perfil" oscuro pequeño.

### Artículos del foro (página Foro)
- Lista vertical (no grid). Avatar circular 40–48px, título H3 18px/600, línea meta "Autor · Empresa · Categoría · Hace X horas" 12–14px gris, hashtags en pill azules/grises suaves, footer con iconos y contadores (respuestas, vistas, likes).
- Badge "Destacado" pill dorado/crema en artículos destacados.
- Sidebar izquierdo: buscador pill + lista de categorías con contadores (Todos 6, Tendencias 234, Tecnología 189…).

## 6. Estructura página por página

**NOTA ADVERTENCIA** 
Las páginas aquí incluidas sólo corresponden a un diseño previo. Las páginas de la nueva web están definidas en: y por tanto este apartado deberá ser corregido de acuerdo a ese documento.
| Página | Hero | Contenido principal |
|---|---|---|
| **Home** | Oscuro `#1A1A1A`/`#0A0A0A`, H1 72px/800 blanco en 2 líneas, subtítulo `rgba(255,255,255,0.6)`, CTA blanco pill + secundario `rgba(255,255,255,0.1)` | Stats (4.200+ empresas…), categorías en tarjetas, productos destacados grid, cómo funciona, CTA final, footer crema |
| **Panel** | Blanco: saludo + H1 36px + botones derecha | 3 stat-cards con fondos tenues, acciones rápidas grid 4 |
| **Productos** | Título + subtítulo + buscador | Sidebar filtros izquierda + grid 3–4 col de cards producto |
| **Servicios** | Título + subtítulo + buscador | Grid de cards servicio (mixto horizontal) |
| **Empresas** | Título + subtítulo + buscador | Grid 3 col cards empresa |
| **Foro** | Título + subtítulo + botón "Nueva Publicación" | Sidebar categorías + lista de artículos |

*Nota: los botones "Iniciar Sesión" y "Registrar Empresa" no abren modal ni navegan en el preview — son decorativos. La nueva web deberá diseñar su propio flujo (modal o página) manteniendo el estilo pill descrito.*

## 7. Snippet Tailwind para reutilizar

```ts
// tailwind.config.ts (extracto)
theme: {
  extend: {
    fontFamily: {
      sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
    },
    colors: {
      ink: "#111827",
      "ink-deep": "#0A0A0A",
      gold: { DEFAULT: "#E8C98A" },
      cream: {
        50: "#F8F7F5",
        100: "#F8F6F3",
        200: "#F5F4F1",
        300: "#F0EBE4",
      },
    },
    borderRadius: {
      card: "16px",
    },
  },
}
```

Clases recurrentes del original (útiles para replicar):
- Contenido: `max-w-7xl mx-auto px-6`
- Tarjeta: `bg-white rounded-2xl border border-gray-100 p-6` (border de 0.8px ≈ `border`)
- Botón primario: `bg-gray-900 text-white rounded-full px-6 py-3 text-sm font-medium`
- Botón fantasma: `text-gray-700 rounded-full px-4 py-2 text-sm font-medium`
- H1 hero: `text-7xl font-extrabold leading-[72px] tracking-[-1.8px] text-white`
- H1 interior: `text-4xl font-extrabold text-gray-900`

## 8. Checklist para aplicar a la nueva web 

- [ ] Cargar Plus Jakarta Sans (Google Fonts / next/font).
- [ ] Header sticky blanco con nav 5–6 enlaces + 2 botones pill (fantasma + oscuro).
- [ ] Hero oscuro con display 72px/800 o variante clara interior 36px/800.
- [ ] Tarjetas planas 16px radius, borde 1px gray-100, sin sombras.
- [ ] Footer crema `#F5F4F1` con 3–4 columnas.
- [ ] Chips/pills en todos los filtros, categorías y badges.
