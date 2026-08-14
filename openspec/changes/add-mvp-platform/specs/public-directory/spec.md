# public-directory Specification

## ADDED Requirements

### Requirement: Área pública sin registro
El área pública será accesible sin registro ni autenticación y expondrá:
empresas, productos, servicios, proyectos, oportunidades, sectores,
provincias/municipios y empresas destacadas.

#### Scenario: Navegación de visitante anónimo
- **WHEN** cualquier visitante accede a las secciones públicas
- **THEN** puede consultar empresas, contenido publicado, sectores y ubicaciones sin necesidad de cuenta

#### Scenario: Solo contenido aprobado
- **WHEN** una empresa está en estado `pending` o `rejected`
- **THEN** ni la empresa ni su contenido aparecen en ninguna vista pública

### Requirement: Ficha empresarial pública
Cada empresa aprobada tendrá una ficha pública con: logo, nombre, tipo de
entidad, marca de verificación NexCuba, uno o varios sectores, provincia y
municipio, dirección, descripción, productos/servicios/proyectos/oportunidades
publicados, galería de imágenes, teléfono, email, página web y redes sociales.

#### Scenario: Ficha completa
- **WHEN** un visitante abre la ficha de una empresa aprobada
- **THEN** se muestran todos los campos publicados de la ficha, incluidos los datos de contacto públicos
- **AND** sus productos, servicios, proyectos y oportunidades publicados son accesibles desde la ficha

#### Scenario: Marca de verificación
- **WHEN** una empresa ha sido aprobada (verificada por NexCuba)
- **THEN** su ficha y sus apariciones en listados muestran la marca de empresa verificada

### Requirement: Contacto público
Los datos de contacto públicos de la ficha (teléfono, email, web, redes) podrán
ser consultados por cualquier visitante como parte de la visibilidad empresarial.

#### Scenario: Consulta de contacto
- **WHEN** un visitante consulta la ficha
- **THEN** ve los datos de contacto públicos tal y como la empresa los configuró, sin intermediación de la plataforma

### Requirement: Empresas destacadas
El administrador podrá seleccionar empresas que se mostrarán como destacadas en
el área pública (home). En Fase 1 no se destacan productos, servicios,
proyectos ni oportunidades.

#### Scenario: Destacada en home
- **WHEN** el administrador marca una empresa como destacada
- **THEN** la empresa aparece en la sección de empresas destacadas del home
- **AND** al dejar de estar marcada, desaparece de la sección

### Requirement: Modo dual de visualización de listados
Los listados públicos (empresas, productos, servicios, proyectos y
oportunidades) se podrán mostrar en dos modos: **vista de tarjetas**
(estándar, por defecto en ordenador y tablet) y **vista de tabla** (por
defecto en móvil). El visitante podrá alternar entre ambos en cualquier
momento desde un control visible junto al listado (funcional §12.6, decisión D-5).

#### Scenario: Tarjetas por defecto en escritorio/tablet
- **WHEN** un visitante abre un listado desde un dispositivo de escritorio o tablet
- **THEN** los resultados se muestran en vista de tarjetas

#### Scenario: Tabla por defecto en móvil
- **WHEN** un visitante abre un listado desde un dispositivo móvil
- **THEN** los resultados se muestran en vista de tabla por defecto

#### Scenario: Alternar de modo
- **WHEN** el visitante cambia el modo con el control del listado
- **THEN** el listado se muestra en el modo elegido sin perder filtros, búsqueda ni ordenación aplicados
- **AND** la preferencia se recuerda durante la sesión

#### Scenario: Vista de tabla equivalente
- **WHEN** un listado se muestra en vista de tabla
- **THEN** cada fila ofrece la información esencial del elemento (nombre, empresa responsable cuando aplique, territorio/sector, badges de verificación/premium) y acceso a su ficha

### Requirement: Páginas de sectores y territorio
El área pública ofrecerá páginas navegables por sector y por provincia (y
municipio cuando aplique) listando las empresas y contenido asociados, como base
del SEO territorial/sectorial.

#### Scenario: Página de sector
- **WHEN** un visitante abre la página de un sector
- **THEN** ve las empresas aprobadas de ese sector y su contenido publicado asociado

#### Scenario: Página territorial
- **WHEN** un visitante abre la página de una provincia o municipio
- **THEN** ve las empresas cubanas aprobadas ubicadas en ese territorio

### Requirement: Contacto mediante NexCuba en la ficha
La ficha podrá ofrecer el mecanismo «Contactar mediante NexCuba», separado del
contacto público y sujeto a las reglas de networking y Premium.

#### Scenario: Botón de contacto interno
- **WHEN** una empresa con derecho a networking visualiza la ficha de otra empresa
- **THEN** ve la acción de contacto mediante NexCuba (detalle en `networking`)
- **WHEN** una empresa extranjera FREE visualiza una ficha
- **THEN** no se le ofrece iniciar la solicitud de contacto interno
