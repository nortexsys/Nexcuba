# admin-backoffice Specification

## ADDED Requirements

### Requirement: Gestión de solicitudes de empresa
El backoffice permitirá al administrador revisar las solicitudes de alta
pendientes, consultar los datos del solicitante y, en el caso cubano, el
documento acreditativo, y aprobar o desaprobar cada solicitud.

#### Scenario: Revisión de solicitud cubana
- **WHEN** el administrador abre una solicitud de MIPYME/cooperativa
- **THEN** ve todos los datos del formulario y puede descargar/visualizar el documento acreditativo

#### Scenario: Revisión de solicitud extranjera
- **WHEN** el administrador abre una solicitud extranjera
- **THEN** ve los datos y la página web aportada; no se exige documento

#### Scenario: Aprobar / desaprobar
- **WHEN** el administrador decide sobre una solicitud
- **THEN** se aplica el flujo de `company-registration` (activación + email automático, o desaprobación con comunicación manual del motivo)

### Requirement: Gestión administrativa de empresas
El administrador podrá consultar y gestionar las empresas dadas de alta: datos,
estado, tipo, Premium (alta manual, decisión D-2) y destacado.

#### Scenario: Alta manual de Premium
- **WHEN** el administrador marca una empresa extranjera como PREMIUM con fecha de inicio
- **THEN** la empresa obtiene las capacidades Premium durante un año (caducidad automática al vencer)

#### Scenario: Caducidad de Premium
- **WHEN** llega la fecha de caducidad anual
- **THEN** la empresa vuelve a FREE y pierde publicación e inicio de contactos sin perder su perfil ni datos

#### Scenario: Marcar destacada
- **WHEN** el administrador activa/desactiva el destacado de una empresa
- **THEN** la sección de destacadas del home se actualiza conforme a `public-directory`

### Requirement: Gestión de taxonomías
El administrador gestionará sectores, categorías, tipos de oportunidad y
etiquetas conforme a `taxonomies` (CRUD + desactivación sin romper histórico).

### Requirement: Intervención posterior sobre contenido
El administrador podrá consultar todo el contenido publicado y actuar
posteriormente sobre él (ocultar o eliminar) cuando sea necesario, sin que esto
constituya un flujo de aprobación previa.

#### Scenario: Ocultar contenido inadecuado
- **WHEN** el administrador oculta un contenido publicado
- **THEN** desaparece de las vistas públicas y búsquedas, y queda registrado quién y cuándo (trazabilidad)

### Requirement: Consulta de networking
El administrador podrá consultar de forma básica la actividad de networking:
solicitudes enviadas, pendientes y contactos establecidos.

#### Scenario: Consulta de solicitudes
- **WHEN** el administrador abre la sección de contactos del backoffice
- **THEN** ve el listado de solicitudes con su estado y las empresas implicadas

### Requirement: Estadísticas de Fase 1
El backoffice mostrará: empresas registradas, verificadas, MIPYMES,
cooperativas, extranjeras FREE, extranjeras PREMIUM, productos, servicios,
proyectos y oportunidades publicados, solicitudes de contacto, solicitudes
pendientes, contactos establecidos y evolución de altas y publicaciones.

#### Scenario: Panel de estadísticas
- **WHEN** el administrador abre Estadísticas
- **THEN** ve todos los contadores de Fase 1 y una gráfica de evolución de altas y publicaciones en el tiempo

### Requirement: CRM interno de digitalización
El backoffice mantendrá internamente por empresa: tiene web (sí/no), dominio
propio (sí/no), email corporativo (sí/no), redes sociales (sí/no), nivel de
completitud del perfil, necesidades digitales, potencial comercial y estado de
seguimiento. Esta información es interna de NexCuba y no se mostrará a las
empresas ni al público.

#### Scenario: Ficha CRM
- **WHEN** el administrador abre la ficha CRM de una empresa
- **THEN** puede editar los campos internos de digitalización y seguimiento

#### Scenario: CRM invisible para la empresa
- **WHEN** una empresa consulta su perfil o el público consulta una ficha
- **THEN** ningún dato del CRM interno es visible

### Requirement: Trazabilidad administrativa
Las acciones críticas del backoffice (aprobaciones, desaprobaciones, altas de
Premium, destacados, ocultación/eliminación de contenido) quedarán registradas
con usuario administrador, acción y fecha.

#### Scenario: Registro de auditoría
- **WHEN** el administrador realiza una acción crítica
- **THEN** la acción queda registrada en el log de auditoría consultable desde el backoffice

### Requirement: Acceso restringido al backoffice
Solo usuarios administradores autenticados accederán al backoffice. El acceso
de administradores se gestiona internamente (sin registro público).

#### Scenario: Acceso no administrador
- **WHEN** un usuario de empresa o anónimo intenta acceder a una URL del backoffice
- **THEN** recibe error de autorización (403/redirect) sin exponer ninguna función administrativa
