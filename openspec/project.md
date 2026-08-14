# Project Context — NexCuba

## What is NexCuba

Plataforma de visibilidad, descubrimiento y conexión empresarial para el tejido
empresarial cubano (MIPYMES y cooperativas) y empresas extranjeras interesadas
en Cuba. **No es un marketplace**: sin precios, sin pedidos, sin pagos por
productos. NexCuba consigue que las empresas sean encontradas, conocidas y
conectadas entre sí.

- **Documento funcional canónico:** `NexCuba_Documento_Funcional_v1.0.md` (v1.0, agosto 2026).
- **Spec de diseño visual:** `design-spec.md` (tokens, tipografía y componentes; su §6 de páginas está obsoleta — la estructura de pantallas sale del funcional §31).
- **Metodología:** Nortex Spec-Driven Development (OpenSpec, Perfil B).

## Profile decision (Fase 1 · Discover — registered)

**Perfil B — Aplicación web.** Disparadores del árbol de decisión
(`profiles/PROFILE-SELECTION.md` de nortex-web-infra):

1. Cuentas de usuario y área privada con login → **Sí** (empresas + admin).
2. Datos introducidos por el usuario que persisten → **Sí** (perfil, contenido, networking).
3. Lógica de negocio en servidor → **Sí** (verificación, reglas FREE/PREMIUM, autorización de contenido).

Consecuencias: flujo OpenSpec completo con adversarial review, TDD obligatorio,
tipado estricto, cobertura ≥90%, validación server-side, RLS multiempresa.

## Stack (fase DEFINE — detalle en changes/add-mvp-platform/design.md)

- **Frontend:** Next.js (App Router) + TypeScript estricto + Tailwind CSS (tokens de `design-spec.md`).
- **Backend/Datos:** Supabase (Postgres + Auth + Storage + RLS). Proyecto ya provisionado.
- **Email transaccional:** a decidir (ver propuesta, dependencia D-2).
- **Deploy objetivo:** Vercel (frontend) + Supabase (datos). Dominio: nexcuba.org.

## Decisions registered (Fase 2 · Define)

| # | Decisión | Resolución | Fecha |
|---|----------|------------|-------|
| D-1 | Idioma UI Fase 1 | Solo español; strings centralizados para habilitar i18n futuro sin refactor | 2026-08-14 |
| D-2 | Premium en Fase 1 | Alta manual por administrador (con caducidad anual). Sin pasarela de pago en MVP | 2026-08-14 |
| D-3 | Git | Repo propio en la carpeta del proyecto → github.com/nortexsys/Nexcuba; `docs/` y `.env` nunca se comitean | 2026-08-14 |
| D-4 | Propuesta Fase 2 | Ligera: alcance por bloques + hitos, sin presupuesto detallado | 2026-08-14 |
| D-5 | Modo dual de visualización de listados | Tarjetas por defecto en escritorio/tablet, tabla por defecto en móvil, alternable por el visitante sin perder filtros/búsqueda/orden (funcional v1.1 §12.6) | 2026-08-14 |

**Fase 2 aprobada por el Product Owner el 2026-08-14** (propuesta, 9 specs, design, tasks y dependencia D-2/Resend). Fase 3 considerada cubierta por `design-spec.md` + estructura de páginas de las specs (criterio del PO). Siguiente: Fase 4 · Construcción (H1).

## Reglas duras del proyecto (del funcional)

1. Sin precios, sin carrito, sin pedidos, sin pagos por productos.
2. No se admiten TCPs; no hay cuentas de particulares.
3. Una empresa = un usuario en Fase 1.
4. Publicación sin aprobación previa; eliminación inmediata.
5. Cada empresa solo gestiona su propio contenido.
6. Verificación ≠ Premium (independientes).
7. Solo imágenes como multimedia en Fase 1.

## Convenciones

- Artefactos para el Product Owner (propuestas, specs): **español**.
- Artefactos técnicos (código, commits, tests, `design.md`, `tasks.md`): **inglés**.
- Basado en `base-standards.md` de nortex-web-infra.
- **Git (doble cuenta):** remote SIEMPRE por SSH alias `git@github-nortexsys:nortexsys/Nexcuba.git`
  (nunca HTTPS, que usaría la cuenta personal `aguillensp-sudo`). Identidad local:
  `nortexsys <nortexsys@users.noreply.github.com>`. Referencia local de la configuración:
  `C:\Users\admin\git-doble-cuenta-github.md` (no se comitea).
