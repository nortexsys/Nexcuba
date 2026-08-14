# Propuesta de cambio — MVP NexCuba (add-mvp-platform)

**Fase:** 2 · Definición — Especificación
**Estado:** Pendiente de aprobación del Product Owner
**Fecha:** Agosto 2026
**Perfil:** B — Aplicación web (SDD completo)

---

## 1. Por qué

NexCuba persigue tres cosas (funcional §30): **visibilidad empresarial +
descubrimiento + conexión**. Hoy el tejido empresarial cubano (MIPYMES,
cooperativas) y las empresas extranjeras interesadas en Cuba carecen de un punto
de encuentro que permita encontrarse, conocerse y establecer contactos, sin que
eso implique un marketplace con precios y transacciones.

Este cambio construye el **MVP / Fase 1** completo del funcional: el núcleo de
valor demostrable de la plataforma.

## 2. Qué se construye (alcance por bloques)

| # | Bloque | Contenido | Capacidad OpenSpec |
|---|--------|-----------|--------------------|
| B1 | Registro y verificación | Alta de MIPYMES/cooperativas (con documento acreditativo) y de empresas extranjeras (web obligatoria, sin documento); revisión y aprobación administrativa; activación automática + email | `company-registration` |
| B2 | Área pública y directorio | Home, directorio de empresas, ficha empresarial pública completa, empresas destacadas, páginas de sectores y territorio | `public-directory` |
| B3 | Publicación de contenido | Productos, servicios, proyectos y oportunidades con sus campos, imágenes, reglas de publicación inmediata y propiedad única | `content-publishing` |
| B4 | Búsqueda y descubrimiento | Buscador general siempre visible (bajo el menú, centrado, placeholder «Búsqueda general en nexcuba.org»), filtros por sección, orden por fecha | `search-discovery` |
| B5 | Taxonomías | Sectores multi-asignación, categorías oficiales + etiquetas (híbrido), provincia/municipio para empresas cubanas; administrables | `taxonomies` |
| B6 | Networking | Solicitud de contacto «mediante NexCuba» (asunto + mensaje), estados pendiente/aceptada, contactos establecidos, notificaciones in-app + email | `networking` |
| B7 | Área privada empresarial | Dashboard, mi empresa (perfil con % completitud), gestión de las 4 publicaciones, contactos, configuración | `company-portal` |
| B8 | Backoffice de administración | Revisión de solicitudes y documentos, gestión de empresas, taxonomías, destacados, intervención sobre contenido, consulta de networking, estadísticas Fase 1, CRM interno de digitalización, alta manual Premium | `admin-backoffice` |
| B9 | Modelo FREE/PREMIUM | Matriz de capacidades para empresas extranjeras; Premium anual activado manualmente por el administrador (decisión D-2) | `freemium-foreign-companies` |

Diseño visual: tokens y componentes de `design-spec.md` (editorial premium
minimalista, Plus Jakarta Sans, monocromo + acento dorado, cards planas, pills).

## 3. Qué NO se construye (fuera del MVP)

Queda expresamente fuera (funcional §26 y decisiones registradas):

- Pagos online / pasarela de cobro del Premium (alta manual, D-2).
- Búsqueda inteligente con IA y búsqueda en lenguaje natural.
- Mensajería/chat interno.
- Multiusuario por empresa, empleados o roles internos (una empresa = un usuario).
- Cuentas de particulares; altas de TCPs.
- Contenido multimedia distinto de imágenes.
- Moderación previa de publicaciones (no existe en Fase 1).
- Interfaz en inglés (D-1; preparado para i18n futuro).
- Analítica avanzada (búsquedas, tendencias, más consultados).
- Monetización de destacados.

## 4. Hitos de construcción (Fase 4)

Orden por dependencia; cada hito cierra con la validación del agente validador.

| Hito | Entregable | Depende de |
|------|------------|------------|
| H1 | Proyecto scaffolded: Next.js + TS estricto + Tailwind con tokens + tooling + CI de tests | — |
| H2 | Fundación de datos: esquema Postgres, RLS, storage buckets, seeds (provincias/municipios, taxonomías iniciales) | H1 |
| H3 | Auth y registro: altas cubana/extranjera, estado pendiente, aprobación + email automático | H2 |
| H4 | Backoffice: solicitudes, empresas, taxonomías, destacados, Premium manual, CRM, estadísticas | H3 |
| H5 | Área pública: home, directorio, ficha, sectores, territorio, destacadas | H2 |
| H6 | Área privada empresarial: dashboard, perfil con completitud, CRUD de las 4 publicaciones con imágenes | H3 |
| H7 | Búsqueda general + filtros y orden por sección | H5, H6 |
| H8 | Networking: solicitudes, contactos, notificaciones in-app + email | H6 |
| H9 | SEO on-page (metadatos, sitemap, schema markup, páginas territoriales/sectoriales), accesibilidad, rendimiento | H5–H8 |
| H10 | Verificación Fase 5: criterios de aceptación, adversarial review, cobertura ≥90%, informe | H1–H9 |

## 5. Dependencias y puntos abiertos que requieren al PO

| # | Dependencia | Estado |
|---|-------------|--------|
| D-2 | **Email transaccional** (aprobación de alta, notificaciones de networking). Propuesta: Resend (capa gratuita suficiente para MVP). Implica crear cuenta y DNS en el dominio. | Pendiente de aprobación con esta propuesta |
| D-3 | **Dominio nexcuba.org**: comprar/apuntar DNS cuando llegue Fase 6 (despliegue). | Pendiente (no bloquea construcción) |
| D-4 | **Lista inicial de sectores y categorías** oficiales: se propondrá un seed inicial editable desde el backoffice; el PO la revisará durante la construcción. | Seed propuesto en design; revisable |
| D-5 | **Textos legales** (privacidad, términos, cookies): escalados a PO antes de publicar (Fase 5/6), conforme a base-standards (implicación legal). | Fase 5 |

## 6. Criterios de éxito (resumen — detalle en specs)

Los criterios completos y verificables están en las 9 especificaciones de
capacidad de este cambio. Los de mayor nivel:

1. Un visitante sin cuenta encuentra empresas cubanas por nombre, sector o
   territorio, y ve su ficha completa con datos de contacto públicos.
2. Una MIPYME se registra con documento, es aprobada por el administrador,
   recibe email automático y publica productos/servicios/proyectos/oportunidades
   visibles al instante.
3. Una empresa extranjera FREE solo consulta; con Premium (alta manual) publica
   e inicia contactos.
4. Dos empresas se contactan mediante NexCuba, aceptan la solicitud y quedan en
   sus listas de contactos, con notificaciones dentro y fuera de la plataforma.
5. El administrador opera todo el ciclo (verificación, taxonomías, destacados,
   estadísticas, CRM) desde el backoffice.

## 7. Impacto

- **Nuevo producto**; no toca sistemas existentes.
- Repositorio: `github.com/nortexsys/Nexcuba` (rama `main` protegida).
- Servicios: Supabase (ya provisionado), Vercel y email transaccional (D-2).

---

**Aprobación del PO:** la aprobación de esta propuesta (junto con las specs,
`design.md` y `tasks.md` de este cambio) es la puerta que separa la Fase 2
(definir) de la Fase 3/4 (diseño de detalle pendiente menor + construcción).
Nada se construye hasta esa aprobación.
