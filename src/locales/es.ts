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
  auth: {
    register: {
      title: 'Registro de MIPYME o cooperativa',
      subtitle: 'La solicitud será revisada por el administrador antes de activar tu empresa.',
      foreignTitle: 'Registro de empresa extranjera',
      foreignSubtitle:
        'No se exige documento acreditativo; la página web sirve de referencia de identificación.',
      foreignLink: '¿Representas una empresa extranjera? Regístrate aquí',
      cubanLink: '¿Eres una MIPYME o cooperativa cubana? Regístrate aquí',
      applicantFirstName: 'Nombre del solicitante',
      applicantLastName: 'Apellidos del solicitante',
      email: 'Email',
      phone: 'Teléfono',
      companyName: 'Nombre de la empresa',
      entityType: 'Tipo de entidad',
      entityTypeMipyme: 'MIPYME',
      entityTypeCooperative: 'Cooperativa',
      province: 'Provincia',
      municipality: 'Municipio',
      municipalityEmpty: 'Selecciona una provincia',
      address: 'Dirección física',
      extraIdData: 'Datos identificativos adicionales',
      extraIdDataHint: 'Códigos o referencias de inscripción (opcional)',
      country: 'País',
      website: 'Página web',
      websiteHint: 'Obligatoria — https://…',
      document: 'Documento acreditativo',
      documentHint: 'PDF, JPG o PNG · máximo 10 MB',
      password: 'Contraseña',
      passwordHint: 'Mínimo 8 caracteres — será tu clave de acceso',
      confirmPassword: 'Confirmar contraseña',
      submit: 'Enviar solicitud',
      submitting: 'Enviando…',
      reviewFields: 'Revisa los campos marcados.',
      successTitle: 'Solicitud enviada',
      successBody:
        'Tu solicitud está pendiente de revisión. Te avisaremos por email cuando el administrador la resuelva.',
    },
    login: {
      title: 'Iniciar sesión',
      email: 'Email',
      password: 'Contraseña',
      submit: 'Entrar',
      submitting: 'Entrando…',
      forgot: '¿Olvidaste tu contraseña?',
      noAccount: '¿Todavía no tienes cuenta?',
      registerCta: 'Registra tu empresa',
    },
    recover: {
      title: 'Recuperar contraseña',
      submit: 'Enviar enlace de recuperación',
      submitting: 'Enviando…',
      back: 'Volver al acceso',
    },
    reset: {
      title: 'Nueva contraseña',
      submit: 'Guardar contraseña',
      submitting: 'Guardando…',
      missingCode:
        'El enlace de recuperación no es válido. Solicita uno nuevo desde recuperar contraseña.',
      mismatch: 'Las contraseñas no coinciden.',
    },
    portal: {
      title: 'Área empresarial',
      pendingTitle: 'Solicitud en revisión',
      pendingBody:
        'Tu solicitud de incorporación está siendo revisada por el equipo de NexCuba. Recibirás un email en cuanto se resuelva.',
      rejectedTitle: 'Solicitud desaprobada',
      rejectedBody:
        'Tu solicitud no fue aprobada. El motivo se te ha comunicado por email; escríbenos si necesitas más información.',
      signOut: 'Cerrar sesión',
      dashboardPlaceholder:
        'El panel de empresa (perfil, contenido, networking) se activa en el siguiente hito.',
    },
    admin: {
      title: 'Backoffice',
      signOut: 'Cerrar sesión',
      pendingApplications: (n: number) =>
        `${n} ${n === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de revisión`,
      placeholder: 'La bandeja completa de gestión llega en el siguiente hito.',
    },
  },
} as const;

export type Locale = typeof es;
