# company-portal Specification

## ADDED Requirements

### Requirement: Acceso y navegación del área empresarial
Las empresas aprobadas accederán a un área privada con la navegación: Dashboard,
Mi empresa, Productos, Servicios, Proyectos, Oportunidades, Contactos y
Configuración.

#### Scenario: Navegación completa
- **WHEN** una empresa aprobada inicia sesión
- **THEN** el menú del área privada ofrece las ocho secciones y ninguna función de otra empresa es accesible

### Requirement: Dashboard
El dashboard ofrecerá una visión resumida de la empresa: estado del perfil,
número de publicaciones por tipo y actividad de networking (solicitudes
pendientes recibidas y contactos establecidos).

#### Scenario: Resumen al entrar
- **WHEN** la empresa abre su dashboard
- **THEN** ve su indicador de completitud de perfil, el recuento de productos/servicios/proyectos/oportunidades y sus solicitudes de contacto pendientes

### Requirement: Perfil editable con completitud
La empresa podrá actualizar la información de su perfil desde «Mi empresa».
Determinados datos serán obligatorios para completar el perfil y el sistema
mostrará un indicador de porcentaje de completitud.

#### Scenario: Indicador de completitud
- **WHEN** la empresa visualiza su perfil
- **THEN** ve un porcentaje de completitud calculado sobre los campos definidos (logo, descripción, sectores, contacto, web, redes, ubicación)

#### Scenario: Actualización inmediata
- **WHEN** la empresa guarda cambios de perfil
- **THEN** la ficha pública refleja los cambios en la siguiente carga

#### Scenario: Email de acceso protegido
- **WHEN** la empresa cambia el email responsable desde Configuración
- **THEN** el cambio requiere verificación por email antes de aplicarse (mecanismo seguro, funcional §28)

### Requirement: Gestión de publicaciones propias
Desde las secciones Productos, Servicios, Proyectos y Oportunidades, la empresa
gestionará su contenido conforme a `content-publishing` (crear, editar,
eliminar; inmediatez; propiedad única; imágenes con límites).

#### Scenario: Gestión por sección
- **WHEN** la empresa entra a una sección de contenido
- **THEN** ve solo su contenido y puede crear, editar o eliminar según sus derechos

### Requirement: Configuración
La sección Configuración permitirá gestionar el email responsable (con
verificación) y datos de acceso de la cuenta de la empresa.

#### Scenario: Datos de acceso
- **WHEN** la empresa accede a Configuración
- **THEN** puede iniciar el cambio de email con verificación y cambiar su contraseña
