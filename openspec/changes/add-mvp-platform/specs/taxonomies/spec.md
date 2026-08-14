# taxonomies Specification

## ADDED Requirements

### Requirement: Sectores multi-asignación
Las empresas podrán pertenecer a uno o varios sectores. Los sectores serán una
taxonomía controlada administrada por NexCuba.

#### Scenario: Empresa multi-sector
- **WHEN** una empresa selecciona dos o más sectores en su perfil
- **THEN** aparece en las vistas y búsquedas de todos sus sectores

### Requirement: Sistema híbrido categorías + etiquetas
Productos y servicios usarán categorías oficiales administradas por NexCuba y
podrán incorporar etiquetas adicionales libres, combinando taxonomía controlada
y etiquetado colaborativo.

#### Scenario: Categoría obligatoria
- **WHEN** una empresa publica un producto o servicio
- **THEN** debe elegir una categoría oficial de la lista administrada

#### Scenario: Etiquetas adicionales
- **WHEN** una empresa añade etiquetas libres a una publicación
- **THEN** son visibles en la ficha y utilizables como filtro

### Requirement: Clasificación territorial cubana
Las empresas cubanas se clasificarán por provincia y municipio. La estructura
territorial (15 provincias + municipio especial y sus municipios) será parte de
los datos base del sistema y facilitará páginas y búsquedas territoriales.

#### Scenario: Selección territorial encadenada
- **WHEN** una empresa cubana selecciona provincia en su perfil o registro
- **THEN** el selector de municipios se limita a los municipios de esa provincia

### Requirement: Taxonomías administrables
Sectores, categorías, tipos de oportunidad y etiquetas serán administrables
desde el backoffice (crear, editar, desactivar), sin despliegues de código.

#### Scenario: Nueva categoría desde backoffice
- **WHEN** el administrador crea una categoría nueva
- **THEN** queda inmediatamente disponible en los formularios de publicación

#### Scenario: Desactivar taxonomía sin romper contenido
- **WHEN** el administrador desactiva una categoría usada por contenido existente
- **THEN** deja de ofrecerse en nuevos formularios sin ocultar el contenido histórico que la usa
