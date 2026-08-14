# company-registration Specification

## ADDED Requirements

### Requirement: Registro de MIPYME o cooperativa cubana
El sistema ofrecerá un formulario de solicitud de incorporación para MIPYMES y
cooperativas cubanas que recogerá: nombre y apellidos del solicitante, email,
teléfono, nombre de la empresa, tipo de entidad (MIPYME o cooperativa),
provincia, municipio, dirección física, datos identificativos adicionales y un
documento acreditativo de la condición de MIPYME o cooperativa.

#### Scenario: Solicitud cubana completa
- **WHEN** un solicitante completa el formulario de MIPYME/cooperativa con todos los campos obligatorios y adjunta el documento acreditativo (PDF, JPG o PNG, máx. 10 MB)
- **THEN** la solicitud se registra con estado `pending` (Solicitud pendiente) y queda visible en el backoffice del administrador
- **AND** el solicitante ve una confirmación de que su solicitud está pendiente de revisión

#### Scenario: Solicitud cubana sin documento
- **WHEN** el solicitante envía el formulario sin el documento acreditativo o con un formato/tamaño no admitido
- **THEN** el formulario no se envía y muestra el error de validación correspondiente en el campo documento

### Requirement: Registro de empresa extranjera
El sistema ofrecerá un formulario de solicitud para empresas extranjeras que
recogerá: datos del solicitante, datos de la empresa, datos de contacto y una
página web obligatoria. No se exigirá documento acreditativo.

#### Scenario: Solicitud extranjera con web
- **WHEN** el solicitante completa el formulario extranjero incluyendo una URL de página web válida
- **THEN** la solicitud se registra con estado `pending` y queda visible en el backoffice

#### Scenario: Solicitud extranjera sin web
- **WHEN** el solicitante intenta enviar sin página web
- **THEN** la validación bloquea el envío indicando que la página web es obligatoria

### Requirement: Flujo de aprobación administrativa
Cada solicitud será revisada por el administrador, quien podrá aprobarla o
desaprobarla. La aprobación activará automáticamente la empresa, el acceso del
usuario y enviará un email automático de confirmación al solicitante.

#### Scenario: Aprobación
- **WHEN** el administrador aprueba una solicitud
- **THEN** la empresa pasa a estado `approved` (activa) con acceso operativo al área empresarial
- **AND** el usuario puede iniciar sesión con el email registrado
- **AND** se envía automáticamente un email de confirmación al solicitante

#### Scenario: Desaprobación
- **WHEN** el administrador desaprueba una solicitud
- **THEN** la empresa pasa a estado `rejected` (desaprobada) sin acceso
- **AND** el motivo se comunica manualmente por email al solicitante (el administrador redacta el mensaje fuera de la plataforma o desde su propio correo)

### Requirement: Una empresa, un usuario
El modelo de cuentas aplicará la regla una empresa = un usuario. El email de
registro será el email de acceso; no existirán usuarios secundarios, empleados
ni roles internos por empresa en Fase 1.

#### Scenario: Un usuario por empresa
- **WHEN** una empresa aprobada inicia sesión
- **THEN** accede únicamente a los datos y funciones de su propia empresa
- **AND** no existe vía en la UI para crear usuarios adicionales asociados a la empresa

### Requirement: Sin cuentas de particulares
Solo podrán solicitar acceso las MIPYMES, cooperativas cubanas y empresas
extranjeras definidas. No existirá registro para personas físicas ni TCPs.

#### Scenario: Visitante sin cuenta
- **WHEN** una persona física navega la plataforma
- **THEN** puede consultar todo el área pública sin registro
- **AND** no se le ofrece ninguna opción de crear cuenta de usuario particular

### Requirement: Acceso bloqueado hasta aprobación
Un usuario registrado cuya solicitud esté pendiente o desaprobada no podrá
acceder al área empresarial ni publicar contenido.

#### Scenario: Login con solicitud pendiente
- **WHEN** un usuario cuya empresa está `pending` intenta entrar al área empresarial
- **THEN** el sistema le muestra una pantalla informativa de «solicitud en revisión» sin acceso a las funciones del portal
