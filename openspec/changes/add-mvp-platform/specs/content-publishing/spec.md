# content-publishing Specification

## ADDED Requirements

### Requirement: Cuatro tipos de contenido
Las empresas podrán crear, editar y eliminar cuatro tipos de contenido:
Producto, Servicio, Proyecto y Oportunidad, con los campos del funcional §10
(nombre, categoría, descripción, imágenes, empresa responsable, sector y
etiquetas; cobertura territorial en servicios; estado y necesidades en
proyectos; tipo de necesidad en oportunidades).

#### Scenario: Crear producto
- **WHEN** una empresa con derecho a publicar completa el formulario de producto (nombre, categoría, descripción, imágenes) y lo publica
- **THEN** el producto queda visible inmediatamente en su ficha y en las vistas públicas de productos

#### Scenario: Crear servicio con cobertura
- **WHEN** una empresa publica un servicio seleccionando cobertura Local, Provincial, Nacional o Internacional
- **THEN** la cobertura se muestra en la ficha del servicio y es filtrable

#### Scenario: Crear proyecto con estado
- **WHEN** una empresa publica un proyecto con estado y necesidades asociadas
- **THEN** ambos campos se muestran en la vista pública del proyecto

#### Scenario: Crear oportunidad tipada
- **WHEN** una empresa publica una oportunidad seleccionando su tipo (Proveedor, Cliente, Socio, Distribuidor, Tecnología, Equipamiento, Materias primas, Servicios, Financiación, Inversión, Otro)
- **THEN** el tipo es visible y filtrable

### Requirement: Sin precios ni transacciones
Ningún tipo de contenido admitirá precios, carrito, pedidos ni pagos. Los
formularios no contendrán campos de precio y la UI no ofrecerá acciones de
compra.

#### Scenario: Sin campo de precio
- **WHEN** una empresa crea cualquier contenido
- **THEN** no existe campo de precio ni acción de compra/cotización en el flujo de publicación ni en la vista pública

### Requirement: Inmediatez funcional
La publicación, modificación y eliminación se reflejarán inmediatamente en el
área pública, sin flujo de aprobación previa ni demoras.

#### Scenario: Edición inmediata
- **WHEN** una empresa guarda cambios en un contenido propio publicado
- **THEN** la vista pública refleja los cambios en la siguiente carga

#### Scenario: Eliminación inmediata
- **WHEN** una empresa elimina un contenido propio (con confirmación)
- **THEN** el contenido desaparece de la plataforma de inmediato, sin papelera visible para el público

### Requirement: Propiedad única del contenido
Todo contenido pertenecerá a una única empresa. Una empresa solo podrá crear,
editar y eliminar su propio contenido; jamás el de otra. El control se aplicará
en servidor (RLS), no solo en UI.

#### Scenario: Intento de edición ajena
- **WHEN** la empresa A intenta editar o eliminar por cualquier vía un contenido de la empresa B
- **THEN** el servidor rechaza la operación, incluidos intentos directos contra la API

### Requirement: Derecho a publicar
Solo podrán publicar las empresas con derecho: MIPYMES/cooperativas aprobadas y
empresas extranjeras PREMIUM. Las extranjeras FREE no publican ninguno de los
cuatro tipos.

#### Scenario: Extranjera FREE intenta publicar
- **WHEN** una empresa extranjera FREE accede a las secciones de publicación
- **THEN** no se le ofrece crear contenido y el servidor rechaza cualquier intento directo
- **AND** se le presenta la opción Premium

### Requirement: Imágenes como único multimedia
Fase 1 admitirá únicamente imágenes como recurso multimedia en fichas y
contenidos, con límites controlados: formatos JPG/PNG/WebP, máximo 5 MB por
imagen, máximo 8 imágenes por elemento (galería de empresa o contenido).

#### Scenario: Imagen fuera de límites
- **WHEN** se sube una imagen con formato no admitido o superior a 5 MB, o se excede el máximo de 8
- **THEN** la subida es rechazada con un mensaje de error claro

### Requirement: Modo borrador omitido en Fase 1
No existirán estados de borrador ni programación: todo contenido creado queda
publicado (inmediatez). Esto refleja el funcional §10.5.

#### Scenario: Publicación directa
- **WHEN** una empresa completa y guarda un contenido
- **THEN** el contenido queda publicado; no existe estado intermedio de borrador
