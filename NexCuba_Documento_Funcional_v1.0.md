**NEXCUBA**

*Documento Funcional v1.0*

**Plataforma de visibilidad, descubrimiento y conexión empresarial**

Documento base para diseño, arquitectura y desarrollo

Agosto 2026

# Control del documento

|  |  |
| --- | --- |
| **Elemento** | **Valor** |
| Documento | NexCuba — Documento Funcional |
| Versión | 1.0 |
| Estado | Base funcional para diseño y desarrollo |
| Fecha | Agosto 2026 |
| Alcance | MVP / Fase 1 + evolución prevista |

# 1. Resumen ejecutivo

NexCuba es una plataforma empresarial orientada a dar visibilidad al tejido empresarial cubano y facilitar el descubrimiento y la conexión entre empresas cubanas, empresas extranjeras y el público general.

La plataforma no nace como un marketplace de transacciones. No gestiona precios, pedidos, pagos ni compraventas. Su función principal es conseguir que las empresas sean encontradas, conocidas y puedan presentar sus productos, servicios, proyectos y oportunidades.

El segundo eje de NexCuba es el networking empresarial: las empresas podrán descubrirse y, cuando tengan derecho a ello, establecer contactos mediante la plataforma.

Existe además un objetivo estratégico interno: construir progresivamente una base estructurada de empresas con información sobre su grado de digitalización, que permita identificar oportunidades legítimas para servicios de desarrollo web y digitalización.

# 2. Propósito y objetivos

## 2.1 Propósito

Crear un punto de encuentro empresarial que integre en un único espacio información sobre MIPYMES y cooperativas cubanas y, de forma complementaria, empresas extranjeras interesadas en Cuba.

## 2.2 Objetivos

* Dar visibilidad pública a las MIPYMES y cooperativas cubanas.
* Facilitar que las empresas cubanas se conozcan entre sí.
* Permitir que personas físicas y jurídicas conozcan la oferta empresarial existente.
* Facilitar a inversores y empresas extranjeras la identificación de empresas y proyectos en Cuba.
* Permitir la presentación de productos y servicios sin convertir la plataforma en un ecommerce.
* Dar visibilidad a proyectos y oportunidades empresariales.
* Facilitar networking y solicitudes de contacto entre empresas.
* Construir una base empresarial útil para impulsar la digitalización.

# 3. Principios estratégicos del producto

1. NexCuba no es un marketplace: no muestra precios ni procesa transacciones comerciales.
2. NexCuba busca que las empresas sean encontradas y conocidas.
3. NexCuba facilita el descubrimiento y la conexión empresarial.
4. El acceso público es abierto y no requiere registro.
5. El acceso como empresa está controlado mediante un proceso de alta y verificación.
6. La verificación de una empresa es independiente de su condición Premium.
7. Cada empresa es responsable del contenido que publica.
8. La publicación no requiere aprobación previa por parte de NexCuba en la Fase 1.
9. La plataforma evolucionará progresivamente; las funcionalidades futuras no deben complicar innecesariamente el MVP.

# 4. Tipos de participantes

|  |  |  |
| --- | --- | --- |
| **Participante** | **Acceso** | **Capacidad principal** |
| Visitante / público general | Público | Consultar información y realizar búsquedas. No tiene cuenta. |
| MIPYME cubana | Empresarial | Perfil, publicaciones y networking. |
| Cooperativa cubana | Empresarial | Perfil, publicaciones y networking. |
| Empresa extranjera FREE | Empresarial | Perfil, contacto público y consulta; no publica ni inicia networking interno. |
| Empresa extranjera PREMIUM | Empresarial | Perfil, publicaciones y networking. |
| Administrador NexCuba | Backoffice | Verificación, administración, taxonomías, destacados, estadísticas y CRM interno. |

# 5. Modelo de cuentas y acceso

Regla estructural: una empresa = un usuario. La Fase 1 no contempla múltiples usuarios, empleados ni roles internos por empresa.

El email utilizado en el registro será inicialmente el email de acceso. La empresa podrá modificar sus datos desde su área privada, incluido el email responsable, mediante el mecanismo de seguridad que se defina técnicamente.

No existen cuentas de usuarios particulares. Las personas físicas pueden utilizar NexCuba como visitantes, pero no disponen de área privada ni perfil registrado.

# 6. Registro y verificación

## 6.1 MIPYMES y cooperativas cubanas

El registro constituye una solicitud de incorporación a NexCuba y no un alta automática.

* Nombre y apellidos del solicitante.
* Email.
* Teléfono.
* Nombre de la empresa.
* Tipo de entidad.
* Provincia.
* Municipio.
* Dirección física.
* Datos identificativos adicionales que se definan.
* Documento acreditativo de que se trata de una MIPYME o cooperativa.

El documento podrá cargarse como PDF, imagen u otro formato técnicamente admitido.

## 6.2 Flujo

1. El solicitante completa el formulario.
2. Adjunta la documentación acreditativa.
3. Envía la solicitud.
4. El administrador recibe la solicitud.
5. El administrador revisa los datos y la documentación.
6. Si aprueba, el sistema activa automáticamente la empresa y el acceso del usuario y envía un email automático de confirmación.
7. Si desaprueba, el administrador informa manualmente por email al solicitante del motivo.

## 6.3 Empresas extranjeras

Las empresas extranjeras también requieren aprobación administrativa, pero no deben aportar fichero documental en el alta.

* Datos del solicitante.
* Datos de la empresa.
* Datos de contacto.
* Página web obligatoria.
* Revisión y aprobación por el administrador.

La página web obligatoria constituye una referencia básica para la identificación de la empresa. La verificación y el acceso FREE son independientes de la contratación Premium.

# 7. Estados de empresa

|  |  |
| --- | --- |
| **Estado** | **Descripción** |
| Solicitud pendiente | Solicitud recibida y pendiente de revisión. |
| Aprobada / activa | Empresa admitida y con acceso operativo. |
| Desaprobada | Solicitud no admitida. El motivo se comunica manualmente por email. |

Una empresa, una vez dada de alta, se considera activa. No se contempla un estado funcional de 'inactiva' en el modelo actual.

# 8. Área pública

El área pública constituye el núcleo de visibilidad de NexCuba. No requiere registro.

* Empresas.
* Productos.
* Servicios.
* Proyectos.
* Oportunidades.
* Sectores.
* Provincias y municipios.
* Empresas destacadas.

El visitante podrá consultar información empresarial, productos, servicios, proyectos, oportunidades, ubicaciones y datos públicos de contacto.

# 9. Perfil empresarial público

* Logo.
* Nombre de la empresa.
* Tipo de entidad.
* Marca de empresa verificada por NexCuba.
* Uno o varios sectores.
* Provincia y municipio.
* Dirección.
* Descripción.
* Productos publicados.
* Servicios publicados.
* Proyectos publicados.
* Oportunidades publicadas.
* Galería de imágenes.
* Teléfono.
* Email.
* Página web.
* Redes sociales.

## 9.1 Contacto público

Los datos de contacto públicos forman parte de la visibilidad empresarial y pueden ser consultados por el público.

## 9.2 Contacto mediante NexCuba

La ficha puede mostrar un mecanismo de contacto interno separado del contacto público. Este mecanismo formaliza una relación empresarial dentro de NexCuba y está sujeto a las reglas de acceso y Premium.

# 10. Contenido empresarial

Las empresas podrán crear y gestionar cuatro tipos de contenido: Productos, Servicios, Proyectos y Oportunidades.

## 10.1 Productos

* Nombre.
* Categoría.
* Descripción.
* Imágenes.
* Empresa responsable.
* Sector y etiquetas.
* Información complementaria que no implique precio o transacción.

No se muestran precios ni se gestionan compras.

## 10.2 Servicios

* Nombre.
* Categoría.
* Descripción.
* Imágenes.
* Empresa responsable.
* Sector y etiquetas.
* Área de cobertura: Local, Provincial, Nacional o Internacional.

## 10.3 Proyectos

* Nombre.
* Descripción.
* Sector.
* Ubicación.
* Empresa responsable.
* Estado del proyecto.
* Imágenes.
* Información relacionada.
* Necesidades u oportunidades asociadas.

## 10.4 Oportunidades

Las oportunidades representan aquello que una empresa busca o necesita.

* Proveedor.
* Cliente.
* Socio.
* Distribuidor.
* Tecnología.
* Equipamiento.
* Materias primas.
* Servicios.
* Financiación.
* Inversión.
* Otro.

## 10.5 Reglas de publicación

* No hay precios.
* No hay carrito, pedidos ni pagos.
* No hay transacciones comerciales dentro de NexCuba.
* Solo se contemplan imágenes como recurso multimedia en la Fase 1.
* Las publicaciones se hacen visibles inmediatamente.
* Las modificaciones se reflejan inmediatamente.
* La eliminación es inmediata desde la perspectiva funcional del usuario.
* No existe moderación previa de publicaciones en la Fase 1.

La administración podrá actuar posteriormente sobre contenido cuando sea necesario, pero esto no equivale a un flujo de aprobación previa.

# 11. Propiedad del contenido

Todo producto, servicio, proyecto u oportunidad pertenece a una única empresa. Una empresa solo puede crear, editar y eliminar su propio contenido. No puede modificar contenido perteneciente a otra empresa.

La arquitectura técnica deberá reflejar esta regla mediante controles de autorización apropiados.

# 12. Búsqueda y descubrimiento

## 12.1 Buscador general

NexCuba dispondrá de un buscador general capaz de localizar simultáneamente empresas, productos, servicios, proyectos y oportunidades. Este BUSCADOR, estará siempre visible en todas las pantallas de la web, irá colocado debajo del menú principal, como un contenedor aparte y el campo estará centrado en la pantalla. Llevará un placeholder “Búsqueda general en nexcuba.org”

## 12.2 Búsqueda especializada

Cada sección podrá disponer de búsqueda y filtros específicos.

## 12.3 Filtros

* Tipo de empresa.
* Sector.
* Categoría.
* Provincia.
* Municipio.
* Empresa.
* Etiquetas.
* Verificación.
* Cobertura de servicios.
* Tipo de oportunidad.

## 12.4 Orden

Los resultados se ordenarán inicialmente por fecha de publicación, de más reciente a más antiguo.

## 12.5 Búsqueda inteligente

La búsqueda en lenguaje natural y las capacidades de IA quedan previstas para una fase posterior y no forman parte de la Fase 1.

# 13. Taxonomías y clasificación

Las empresas pueden pertenecer a uno o varios sectores.

Productos y servicios utilizarán categorías oficiales administradas por NexCuba y podrán incorporar etiquetas adicionales. El sistema será híbrido: taxonomía controlada + etiquetas.

Las empresas cubanas se clasificarán territorialmente por provincia y municipio. Esta estructura deberá facilitar posteriormente páginas y búsquedas territoriales.

La clasificación definitiva de sectores, categorías y etiquetas será administrable desde el backoffice.

# 14. Networking y contactos

## 14.1 Solicitud de contacto

Una empresa con derecho a networking puede seleccionar 'Contactar mediante NexCuba', indicar asunto y mensaje y enviar una solicitud.

## 14.2 Estados

|  |  |
| --- | --- |
| **Estado** | **Descripción** |
| Pendiente | La solicitud fue enviada y todavía no ha sido aceptada. |
| Aceptada | La empresa receptora aceptó y se estableció el contacto. |

No existe un estado funcional de rechazo. Una solicitud no respondida permanece pendiente.

## 14.3 Contacto establecido

Al aceptar, las empresas pasan a formar parte de sus respectivos contactos. Los datos de contacto públicos de la empresa pueden consultarse como parte de la relación.

## 14.4 Notificaciones

* Notificación dentro de NexCuba al recibir una solicitud.
* Email al recibir una solicitud.
* Notificación dentro de NexCuba y email cuando una solicitud es aceptada.

# 15. Modelo Freemium de empresas extranjeras

|  |  |  |
| --- | --- | --- |
| **Funcionalidad** | **FREE** | **PREMIUM** |
| Perfil empresarial | Sí | Sí |
| Datos públicos de contacto | Sí | Sí |
| Consultar contenido público | Sí | Sí |
| Aparecer en directorio | Sí | Sí |
| Publicar productos | No | Sí |
| Publicar servicios | No | Sí |
| Publicar proyectos | No | Sí |
| Publicar oportunidades | No | Sí |
| Iniciar solicitudes de contacto | No | Sí |

La suscripción Premium será anual. El mecanismo de contratación, cobro, renovación y gestión de suscripciones queda para el diseño posterior de la solución técnica/comercial.

# 16. Área empresarial privada

## 16.1 Dashboard

El dashboard ofrecerá una visión resumida de la empresa, su perfil, publicaciones y actividad de networking.

## 16.2 Navegación

* Dashboard.
* Mi empresa.
* Productos.
* Servicios.
* Proyectos.
* Oportunidades.
* Contactos.
* Configuración.

## 16.3 Perfil

Determinados datos empresariales serán obligatorios para activar/completar adecuadamente el perfil. El sistema mostrará un indicador de porcentaje de completitud del perfil.

La información del perfil podrá ser actualizada por la propia empresa.

# 17. Administración / Backoffice

El backoffice estará orientado a las tareas necesarias para operar NexCuba, sin crear una capa de complejidad innecesaria.

* Gestión y revisión de solicitudes de empresas.
* Consulta de documentación de MIPYMES y cooperativas.
* Aprobación y desaprobación de solicitudes.
* Gestión administrativa de empresas.
* Gestión de taxonomías: sectores, categorías, tipos de oportunidad y etiquetas.
* Gestión de empresas destacadas.
* Consulta y administración posterior del contenido.
* Consulta básica de networking.
* Consulta de estadísticas.
* Gestión de información interna de CRM/digitalización.

El administrador podrá intervenir posteriormente sobre contenido cuando sea necesario, aunque la publicación no tenga aprobación previa.

# 18. Empresas destacadas

El administrador podrá seleccionar empresas para mostrarlas como empresas destacadas. En la Fase 1 no se contempla destacar productos, servicios, proyectos u oportunidades.

La posibilidad de monetizar posiciones destacadas no forma parte de las decisiones cerradas del MVP.

# 19. CRM interno y objetivo de digitalización

NexCuba mantendrá internamente información estructurada que permita identificar oportunidades de digitalización entre las empresas participantes.

* Tiene web: sí/no.
* Tiene dominio propio: sí/no.
* Tiene email corporativo: sí/no.
* Tiene redes sociales: sí/no.
* Nivel de completitud del perfil.
* Necesidades digitales.
* Potencial comercial.
* Estado de seguimiento.

Esta información será interna de NexCuba y no se presentará como un sistema comercial a las empresas participantes.

El objetivo es permitir identificar de forma ordenada empresas que puedan beneficiarse de servicios de desarrollo web, presencia digital u otras soluciones, sin desvirtuar la finalidad principal de la plataforma.

# 20. Estadísticas

## 20.1 Fase 1

* Empresas registradas.
* Empresas verificadas.
* MIPYMES.
* Cooperativas.
* Empresas extranjeras FREE.
* Empresas extranjeras PREMIUM.
* Productos publicados.
* Servicios publicados.
* Proyectos publicados.
* Oportunidades publicadas.
* Solicitudes de contacto.
* Solicitudes pendientes.
* Contactos establecidos.
* Evolución de altas y publicaciones.

## 20.2 Futuras

* Búsquedas realizadas.
* Búsquedas sin resultados.
* Empresas más consultadas.
* Productos, servicios y oportunidades más consultados.
* Tendencias por sector y territorio.
* Analítica avanzada del ecosistema.

# 21. Reglas de negocio

1. No se admiten TCPs.
2. Sí se admiten MIPYMES y cooperativas cubanas.
3. Sí se admiten empresas extranjeras.
4. Los particulares no pueden crear cuentas.
5. Una empresa equivale a un usuario en la Fase 1.
6. Las empresas cubanas requieren documentación y aprobación.
7. Las empresas extranjeras requieren aprobación y página web obligatoria, pero no documento de acreditación.
8. La verificación no depende del pago Premium.
9. Una empresa aprobada permanece activa según el modelo funcional actual.
10. Las empresas cubanas pueden publicar tras su aprobación.
11. Las empresas extranjeras solo pueden publicar con Premium.
12. No existen precios en NexCuba.
13. No existen transacciones comerciales dentro de NexCuba.
14. Las publicaciones no requieren aprobación previa.
15. Cada empresa solo puede gestionar su propio contenido.
16. La eliminación de contenido es inmediata funcionalmente.
17. Las solicitudes de contacto no aceptadas permanecen pendientes.
18. El networking interno requiere que la empresa tenga derecho a iniciar contactos.

# 22. Flujos funcionales principales

## 22.1 Alta de MIPYME/cooperativa

Registro → datos del solicitante → datos de empresa → ubicación → documentación → envío → revisión administrativa → aprobación o desaprobación → alta y email automático en caso de aprobación.

## 22.2 Alta de empresa extranjera

Registro → datos del solicitante → datos de empresa → web obligatoria → envío → revisión administrativa → aprobación o desaprobación → alta y email automático en caso de aprobación.

## 22.3 Publicación

Empresa autorizada → crear contenido → completar formulario → añadir imágenes → publicar → contenido visible inmediatamente.

## 22.4 Edición

Empresa → seleccionar contenido propio → editar → guardar → cambios visibles inmediatamente.

## 22.5 Eliminación

Empresa → seleccionar contenido propio → eliminar → desaparición inmediata desde la plataforma.

## 22.6 Networking

Empresa autorizada → seleccionar empresa → contactar mediante NexCuba → asunto + mensaje → solicitud pendiente → aceptación → contacto establecido + notificaciones.

# 23. Requisitos no funcionales iniciales

Los siguientes requisitos se consideran principios iniciales de diseño; su especificación técnica detallada se realizará en la fase de arquitectura.

* Seguridad de autenticación y autorización.
* Aislamiento estricto de datos entre empresas.
* Protección de documentos de verificación y datos privados.
* Almacenamiento seguro de imágenes.
* Control de tipos y tamaños de archivos.
* Diseño responsive para ordenador y móvil.
* Rendimiento adecuado para búsquedas y directorios.
* Escalabilidad suficiente para crecimiento progresivo.
* Trazabilidad administrativa de acciones críticas.
* Protección de datos personales conforme al marco legal aplicable.

# 24. SEO y visibilidad

El SEO es estratégico porque una finalidad principal de NexCuba es conseguir visibilidad pública.

La arquitectura deberá permitir páginas públicas indexables para empresas, productos, servicios, proyectos, oportunidades y, cuando tenga sentido, combinaciones territoriales y sectoriales.

La estrategia concreta de URLs, metadatos, sitemap, schema markup, páginas territoriales, enlazado interno y generación controlada de páginas SEO se definirá durante el diseño técnico y de contenidos.

Se evitará generar páginas indexables de bajo valor de forma masiva.

# 25. Fase 1 / MVP

La Fase 1 debe concentrarse en demostrar el núcleo de valor de NexCuba.

* Área pública.
* Directorio de empresas.
* Fichas empresariales.
* Productos.
* Servicios.
* Proyectos.
* Oportunidades.
* Búsqueda y filtros.
* Registro y aprobación de empresas.
* Área privada empresarial.
* Gestión de publicaciones.
* Networking mediante solicitudes de contacto.
* Notificaciones internas y email.
* Empresas destacadas.
* Backoffice básico.
* Estadísticas básicas.
* CRM interno de digitalización.
* Modelo FREE/PREMIUM para empresas extranjeras.

# 26. Funcionalidades futuras

* Búsqueda inteligente mediante IA.
* Mensajería/chat interno.
* Analítica avanzada.
* Inteligencia de mercado basada en búsquedas y demanda.
* Ampliación del modelo Premium.
* Nuevos formatos de contenido.
* Nuevos mecanismos de notificación.
* Posibles servicios comerciales adicionales.

Estas funcionalidades no deben introducirse en la Fase 1 salvo que una decisión posterior modifique el alcance.

# 27. Modelo conceptual de datos

El siguiente modelo es funcional, no todavía una especificación de base de datos.

|  |  |
| --- | --- |
| **Entidad** | **Relaciones principales** |
| Usuario | Representa al usuario asociado a una empresa o al administrador. |
| Empresa | Tiene un usuario, perfil, tipo, ubicación, sectores, publicaciones y contactos. |
| Sector | Puede asociarse a múltiples empresas y contenidos. |
| Categoría | Clasifica productos, servicios y otros contenidos según corresponda. |
| Etiqueta | Permite clasificación complementaria. |
| Producto | Pertenece a una empresa y puede tener imágenes, categoría, sector y etiquetas. |
| Servicio | Pertenece a una empresa y tiene cobertura territorial. |
| Proyecto | Pertenece a una empresa y puede relacionarse con oportunidades. |
| Oportunidad | Pertenece a una empresa y tiene un tipo de necesidad. |
| Imagen | Recurso asociado a empresa o publicación. |
| Solicitud de alta | Representa el proceso de incorporación de una empresa. |
| Documento de verificación | Acreditación asociada a una solicitud de empresa cubana. |
| Solicitud de contacto | Relación pendiente o aceptada entre empresas. |
| Suscripción | Representa el estado Premium de una empresa extranjera. |
| Empresa destacada | Configuración administrativa para destacar una empresa. |
| Métrica | Datos estadísticos y de actividad de la plataforma. |
| Registro CRM | Información interna de digitalización y seguimiento. |

# 28. Decisiones pendientes / a especificar técnicamente

Estas cuestiones no contradicen el funcional. Son decisiones que deben concretarse durante UX, arquitectura, legal o desarrollo.

* Campos exactos y documentos concretos exigidos para acreditar una MIPYME/cooperativa.
* Listado definitivo de sectores, categorías y etiquetas.
* Campos definitivos de cada formulario de producto, servicio, proyecto y oportunidad.
* Límites de imágenes: formatos, tamaño, número y resolución.
* Mecanismo de cambio seguro del email de acceso.
* Sistema de autenticación y recuperación de cuenta.
* Política de eliminación física o conservación técnica de registros.
* Detalle del sistema de pagos y renovación Premium.
* Precio de la suscripción anual Premium.
* Política de privacidad, términos de uso y responsabilidad sobre contenidos.
* Mecanismo de reporte de contenido y actuación administrativa posterior.
* Diseño exacto del dashboard y backoffice.
* Métricas y herramientas de analítica.
* Arquitectura SEO detallada.
* Arquitectura técnica y modelo físico de base de datos. Para este asunto debemos remitirnos a la metodología y arquitecturas de: "C:\Users\admin\proyectos\0\_Nortex Systems\nortex-web-infra"

# 29. Criterios de éxito iniciales

* Que una persona pueda encontrar rápidamente empresas cubanas relevantes.
* Que una empresa pueda crear un perfil empresarial completo sin conocimientos técnicos.
* Que una MIPYME pueda publicar productos, servicios, proyectos y oportunidades con facilidad.
* Que el proceso de verificación sea claro y administrativamente manejable.
* Que el público pueda contactar directamente con las empresas mediante los datos públicos.
* Que las empresas puedan establecer relaciones mediante el sistema de networking.
* Que el directorio pueda crecer sin convertirse en un portal de anuncios generalista.
* Que NexCuba genere una base empresarial estructurada y útil para detectar necesidades de digitalización.

# 30. Definición resumida del producto

**NexCuba = visibilidad empresarial + descubrimiento + conexión.**

La plataforma no pretende vender por las empresas. Pretende conseguir que las empresas sean encontradas.

Una vez encontradas, NexCuba facilita que puedan conocerse, descubrir oportunidades y establecer relaciones empresariales.

# 31. Una estructura de web propuesta

 NEXCUBA
│
├── 🌎 ÁREA PÚBLICA
│   ├── Empresas
│   ├── Productos
│   ├── Servicios
│   ├── Proyectos
│   ├── Oportunidades
│   ├── Sectores
│   ├── Provincias / Municipios
│   └── Empresas destacadas
│
├── 🏢 ÁREA EMPRESARIAL
│   ├── Dashboard
│   ├── Mi empresa
│   ├── Productos
│   ├── Servicios
│   ├── Proyectos
│   ├── Oportunidades
│   ├── Contactos
│   └── Configuración
│
└── 🔐 ADMINISTRACIÓN
    ├── Empresas
    ├── Verificación
    ├── Contenido
    ├── Contactos
    ├── Categorías
    ├── Destacados
    ├── Usuarios
    ├── Estadísticas
    └── CRM digitalización
