# freemium-foreign-companies Specification

## ADDED Requirements

### Requirement: Matriz de capacidades FREE/PREMIUM
Las empresas extranjeras se regirán por la matriz del funcional §15:

| Funcionalidad | FREE | PREMIUM |
|---|---|---|
| Perfil empresarial | Sí | Sí |
| Datos públicos de contacto | Sí | Sí |
| Consultar contenido público | Sí | Sí |
| Aparecer en directorio | Sí | Sí |
| Publicar productos | No | Sí |
| Publicar servicios | No | Sí |
| Publicar proyectos | No | Sí |
| Publicar oportunidades | No | Sí |
| Iniciar solicitudes de contacto | No | Sí |

#### Scenario: Capacidades FREE
- **WHEN** una empresa extranjera FREE opera en la plataforma
- **THEN** tiene perfil, contacto público, consulta y presencia en directorio, y no puede publicar ni iniciar contactos (verificado en servidor)

#### Scenario: Capacidades PREMIUM
- **WHEN** una empresa extranjera tiene Premium activo
- **THEN** puede publicar los cuatro tipos de contenido e iniciar solicitudes de contacto

### Requirement: Premium anual de alta manual
La suscripción Premium será anual. En Fase 1 se activa manualmente desde el
backoffice (decisión D-2), con caducidad automática al año. El mecanismo de
cobro queda fuera del MVP.

#### Scenario: Activación manual
- **WHEN** el administrador activa Premium para una extranjera
- **THEN** las capacidades Premium son efectivas inmediatamente con caducidad a 12 meses

### Requirement: Verificación independiente del Premium
La verificación (aprobación administrativa) y la condición Premium son
independientes: una extranjera FREE está verificada si fue aprobada; el Premium
no verifica ni viceversa.

#### Scenario: FREE verificada
- **WHEN** una empresa extranjera FREE aparece en el directorio
- **THEN** muestra la marca de verificada por haber sido aprobada, sin relación con no ser Premium

#### Scenario: Pérdida de contenido al caducar
- **WHEN** caduca el Premium de una extranjera con contenido publicado
- **THEN** su contenido deja de mostrarse en las vistas públicas (o se retiene según decida el diseño técnico), la empresa pasa a FREE y conserva su perfil
