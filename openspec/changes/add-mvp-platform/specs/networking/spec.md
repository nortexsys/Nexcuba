# networking Specification

## ADDED Requirements

### Requirement: Solicitud de contacto mediante NexCuba
Una empresa con derecho a networking podrá seleccionar «Contactar mediante
NexCuba» en la ficha de otra empresa, indicar asunto y mensaje, y enviar una
solicitud.

#### Scenario: Envío de solicitud
- **WHEN** una empresa con derecho (cubana aprobada o extranjera PREMIUM) envía asunto + mensaje a otra empresa
- **THEN** se crea una solicitud con estado `pending` y la receptora recibe notificación en la plataforma y por email

#### Scenario: Empresa sin derecho
- **WHEN** una empresa extranjera FREE intenta iniciar una solicitud
- **THEN** la acción no está disponible y el servidor rechaza cualquier intento directo

### Requirement: Estados de la solicitud
Las solicitudes tendrán dos estados: `pending` (enviada, sin responder) y
`accepted` (aceptada). No existe estado de rechazo: una solicitud no respondida
permanece pendiente indefinidamente.

#### Scenario: Solicitud pendiente
- **WHEN** la receptora no ha respondido
- **THEN** la solicitud sigue visible como pendiente para ambas partes

#### Scenario: Aceptación
- **WHEN** la empresa receptora acepta la solicitud
- **THEN** la solicitud pasa a `accepted` y ambas empresas pasan a formar parte de sus respectivas listas de contactos

### Requirement: Contacto establecido
Al aceptar, se formaliza la relación: cada empresa aparecerá en la lista de
contactos de la otra y podrá consultarse el contacto público de la contraparte.

#### Scenario: Lista de contactos mutua
- **WHEN** se acepta una solicitud entre A y B
- **THEN** B aparece en los contactos de A y A en los de B, con sus datos de contacto públicos accesibles

### Requirement: Notificaciones
El sistema notificará: (1) al recibir una solicitud, dentro de NexCuba y por
email; (2) al aceptar una solicitud, dentro de NexCuba y por email a la
solicitante.

#### Scenario: Notificación de solicitud recibida
- **WHEN** una empresa recibe una solicitud de contacto
- **THEN** ve la notificación en la plataforma (campana/bandeja) y recibe email

#### Scenario: Notificación de aceptación
- **WHEN** la receptora acepta
- **THEN** la solicitante recibe notificación en la plataforma y por email

### Requirement: Consulta de solicitudes y contactos
Cada empresa verá en su área privada las solicitudes recibidas pendientes, sus
solicitudes enviadas y su lista de contactos establecidos.

#### Scenario: Bandeja de solicitudes
- **WHEN** una empresa entra a su sección Contactos
- **THEN** distingue solicitudes recibidas pendientes, enviadas y contactos establecidos
