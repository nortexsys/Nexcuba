/**
 * UI strings — Spanish only (decision D-1). Single source of truth for copy:
 * components must never hardcode user-facing text, so a future /en locale is
 * additive. The search placeholder is contractual: see spec search-discovery
 * (funcional §12.1) — the exact string is asserted in tests.
 */
export const es = {
  brand: {
    name: 'NexCuba',
    tagline: 'Visibilidad, descubrimiento y conexión empresarial',
  },
  header: {
    nav: {
      companies: 'Empresas',
      products: 'Productos',
      services: 'Servicios',
      projects: 'Proyectos',
      opportunities: 'Oportunidades',
    },
    login: 'Iniciar Sesión',
    register: 'Registrar Empresa',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
  },
  search: {
    region: 'Buscador',
    placeholder: 'Búsqueda general en nexcuba.org',
    submit: 'Buscar',
    label: 'Búsqueda general',
  },
  home: {
    heroTitleLine1: 'Encuentra y conoce el tejido',
    heroTitleLine2: 'empresarial cubano',
    heroSubtitle:
      'El directorio de MIPYMES, cooperativas y empresas extranjeras: visibilidad, descubrimiento y conexión empresarial.',
    heroCta: 'Explorar el directorio',
    heroSecondary: 'Registrar tu empresa',
  },
  footer: {
    description:
      'Plataforma de visibilidad, descubrimiento y conexión empresarial para MIPYMES, cooperativas cubanas y empresas extranjeras.',
    platformTitle: 'Plataforma',
    companyTitle: 'Empresa',
    company: {
      about: 'Sobre Nosotros',
      howItWorks: 'Cómo Funciona',
      contact: 'Contacto',
    },
    legalTitle: 'Legal',
    legal: {
      terms: 'Términos',
      privacy: 'Privacidad',
      cookies: 'Cookies',
    },
    copyright: '© 2026 NexCuba. Todos los derechos reservados.',
  },
  common: {
    viewToggle: {
      legend: 'Modo de visualización',
      cards: 'Tarjetas',
      table: 'Tabla',
    },
    loading: 'Cargando…',
    error: 'Ha ocurrido un error. Inténtalo de nuevo.',
    empty: 'No hay resultados que mostrar.',
    verified: 'Verificada',
    premium: 'Premium',
    resultsCount: (n: number) => `${n} ${n === 1 ? 'resultado' : 'resultados'}`,
  },
} as const;

export type Locale = typeof es;
