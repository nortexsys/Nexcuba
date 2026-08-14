# search-discovery Specification

## ADDED Requirements

### Requirement: Buscador general siempre visible
NexCuba dispondrá de un buscador general capaz de localizar simultáneamente
empresas, productos, servicios, proyectos y oportunidades. Estará siempre
visible en todas las pantallas de la web, colocado debajo del menú principal
como un contenedor aparte, con el campo centrado y el placeholder
«Búsqueda general en nexcuba.org».

#### Scenario: Presencia global
- **WHEN** un visitante navega por cualquier pantalla de la web
- **THEN** el buscador general está visible debajo del menú principal, en un contenedor propio y centrado, con el placeholder exacto indicado

#### Scenario: Búsqueda multi-entidad
- **WHEN** el visitante introduce un término y lanza la búsqueda
- **THEN** los resultados incluyen coincidencias de empresas, productos, servicios, proyectos y oportunidades, agrupadas por tipo
- **AND** las empresas `pending`/`rejected` y su contenido no aparecen nunca

### Requirement: Búsqueda especializada por sección
Cada sección (Empresas, Productos, Servicios, Proyectos, Oportunidades) podrá
disponer de su propia búsqueda y filtros específicos.

#### Scenario: Búsqueda en sección
- **WHEN** el visitante usa la búsqueda/filtros de una sección
- **THEN** los resultados se limitan a esa sección aplicando sus filtros propios

### Requirement: Filtros
Las vistas de descubrimiento ofrecerán filtros por: tipo de empresa, sector,
categoría, provincia, municipio, empresa, etiquetas, verificación, cobertura de
servicios y tipo de oportunidad (según aplique a cada sección).

#### Scenario: Combinación de filtros
- **WHEN** el visitante combina sector + provincia en el directorio de empresas
- **THEN** solo se listan empresas aprobadas que cumplen ambas condiciones

#### Scenario: Filtro de verificación
- **WHEN** el visitante filtra por «verificadas»
- **THEN** solo aparecen empresas aprobadas/verificadas por NexCuba

### Requirement: Orden por defecto
Los resultados se ordenarán inicialmente por fecha de publicación, de más
reciente a más antiguo (`created_at DESC`).

#### Scenario: Orden por defecto
- **WHEN** se muestra cualquier listado de resultados sin orden explícito elegido
- **THEN** el contenido más reciente aparece primero

### Requirement: Búsqueda inteligente fuera de alcance
La búsqueda en lenguaje natural y capacidades de IA quedan fuera de Fase 1; el
buscador será de texto clave y filtros.

#### Scenario: Sin IA en Fase 1
- **WHEN** el visitante usa el buscador
- **THEN** la búsqueda es determinista por texto y filtros, sin procesamiento de lenguaje natural
