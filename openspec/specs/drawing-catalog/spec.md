# drawing-catalog Specification

## Purpose

Decide qué posts de la cuenta del cuaderno son dibujos, a quién se atribuyen, en qué orden aparecen y cómo se navega entre ellos y por el índice.

## Requirements

### Requirement: Un dibujo es un post del cuaderno con #caderno que no es respuesta
El sitio SHALL tratar como dibujo cada post del repositorio del cuaderno que lleve el tag `caderno` en sus facets de tipo tag o en `tags[]`, comparando sin distinguir mayúsculas, y que no sea una respuesta (sin `reply`). Ningún otro post SHALL aparecer como dibujo.

#### Scenario: Tag en el texto
- **WHEN** el cuaderno publica un post con texto "Na praia #caderno #naia" y facets de tag `caderno` y `naia`
- **THEN** el post aparece como dibujo

#### Scenario: Tag solo en tags[]
- **WHEN** un post del cuaderno no tiene facet `caderno` pero `tags[]` contiene `Caderno`
- **THEN** el post aparece como dibujo

#### Scenario: Post sin el tag
- **WHEN** el cuaderno publica un post sin `#caderno`
- **THEN** el post no aparece ni en el índice ni en la navegación

#### Scenario: Respuesta del cuaderno con el tag
- **WHEN** el cuaderno publica una respuesta que lleva `#caderno`
- **THEN** esa respuesta no aparece como dibujo

### Requirement: El nombre del dibujo sale de la lista de configuración
Por convención, cada post del cuaderno lleva como mucho un tag de la lista de nombres de la configuración. El sitio SHALL atribuir cada dibujo al tag (facets o `tags[]`) que coincida con una entrada de la lista, comparando tras normalizar a NFC y sin distinguir mayúsculas, y mostrar el nombre de esa entrada. Si coincidiera más de uno, SHALL usar el que aparece antes en la lista. Si ningún tag coincide, SHALL usar el nombre genérico de la configuración ("o caderno").

#### Scenario: Tag en la lista
- **WHEN** la lista contiene `{ tag: "naia", nombre: "Naia" }` y el dibujo lleva `#NAIA`
- **THEN** el dibujo se atribuye a "Naia"

#### Scenario: Tag con tilde
- **WHEN** la lista contiene `{ tag: "uxía", nombre: "Uxía" }` y el dibujo lleva `#Uxía`
- **THEN** el dibujo se atribuye a "Uxía"

#### Scenario: Tag fuera de la lista
- **WHEN** el dibujo lleva `#caderno #naya` y `naya` no está en la lista
- **THEN** el dibujo se atribuye a "o caderno"

### Requirement: Los dibujos se ordenan por fecha de publicación
Los dibujos SHALL ordenarse por `createdAt`, del más reciente al más antiguo; a igual fecha, por rkey descendente.

#### Scenario: Orden del índice
- **WHEN** hay dibujos del 1, 3 y 2 de marzo
- **THEN** el índice los lista en el orden 3, 2 y 1 de marzo

### Requirement: La home muestra el dibujo más reciente
La página de inicio SHALL mostrar el dibujo más reciente del catálogo con la misma presentación que su página propia.

#### Scenario: Entrar en el sitio
- **WHEN** un visitante abre la URL raíz del sitio
- **THEN** ve el dibujo más reciente con sus respuestas visibles

#### Scenario: Cuaderno sin dibujos
- **WHEN** el repositorio no tiene ningún dibujo
- **THEN** la home muestra un mensaje de cuaderno vacío, sin errores

### Requirement: Cada dibujo tiene una URL propia
Cada dibujo SHALL tener una URL estable basada en su rkey, que se pueda compartir y recargar. Una URL de un rkey que no es un dibujo SHALL mostrar un mensaje de dibujo no encontrado con un enlace al índice.

#### Scenario: Recargar un dibujo
- **WHEN** un visitante recarga la URL de un dibujo concreto
- **THEN** ve ese mismo dibujo

#### Scenario: rkey inexistente
- **WHEN** un visitante abre la URL de un rkey que no existe o no es un dibujo
- **THEN** ve un mensaje de dibujo no encontrado y un enlace al índice

### Requirement: Navegación al dibujo anterior y siguiente
The drawing page SHALL offer a link to the immediately older drawing and a link to the immediately newer drawing, in the catalogue's order, following the order of a book: since the newest drawing comes first, moving forward goes to older drawings. The link to the older drawing SHALL be the "next" one, shown at the right, and the link to the newer drawing SHALL be the "previous" one, shown at the left. Their accessible names SHALL come from the dictionary ("Seguinte" and "Anterior" in Galician). A link without a destination SHALL NOT be shown.

#### Scenario: Dibujo intermedio
- **WHEN** a drawing that is neither the newest nor the oldest is shown
- **THEN** there is a "previous" link at the left to the newer drawing and a "next" link at the right to the older drawing

#### Scenario: Dibujo más reciente
- **WHEN** the newest drawing is shown
- **THEN** there is only the "next" link, at the right, to the older drawing

#### Scenario: Dibujo más antiguo
- **WHEN** the oldest drawing is shown
- **THEN** there is only the "previous" link, at the left, to the newer drawing

#### Scenario: Names of the links
- **WHEN** a screen reader reads the links of an intermediate drawing
- **THEN** the link to the older drawing is named "Seguinte" and the link to the newer one "Anterior"

### Requirement: Página de índice
The site SHALL have an index page, linked from the header of every page, that lists every drawing in the catalogue's order. Each entry SHALL show the thumbnail of the first image (if any), the attributed name and the date, and link to the drawing's page.

#### Scenario: Abrir el índice
- **WHEN** a visitor opens the index
- **THEN** they see every drawing, each with thumbnail, name and date, and tapping one takes them to its page

#### Scenario: Dibujo sin imagen
- **WHEN** a drawing has no image
- **THEN** its index entry is shown without a thumbnail, with name and date

#### Scenario: Link from any page
- **WHEN** a visitor is on a drawing, on the index or on a "drawing not found" page
- **THEN** the header has a link to the index

### Requirement: Cambiar de dibujo muestra al instante lo que ya se conoce
Al ir a otro dibujo desde las flechas o desde el índice, el sitio SHALL mostrar al momento su texto, su nombre, su fecha y los enlaces de navegación con los datos del catálogo, sin dejar la página vacía ni mostrar un aviso de carga a pantalla completa. La imagen, los contadores y las respuestas SHALL aparecer cuando estén disponibles.

#### Scenario: Pulsar la flecha
- **WHEN** un visitante pulsa el enlace al dibujo anterior
- **THEN** ve en ese momento el texto, el nombre y la fecha del nuevo dibujo, y la imagen y las respuestas aparecen después sin que la página se vacíe

#### Scenario: Falla el hilo del AppView
- **WHEN** al cambiar de dibujo falla la lectura del hilo
- **THEN** se siguen viendo el texto, el nombre, la fecha y las flechas, junto con un mensaje de error en lugar de la imagen y las respuestas

### Requirement: Los dibujos vecinos se preparan por adelantado
Después de mostrar un dibujo, el sitio SHALL preparar en segundo plano el dibujo anterior y el siguiente, de modo que al pulsar sus flechas se muestren completos sin esperar a la red, si la preparación terminó hace menos de 60 segundos. Una preparación más antigua NO SHALL usarse.

#### Scenario: Ir al siguiente tras unos segundos
- **WHEN** un visitante ve un dibujo durante unos segundos y pulsa la flecha al siguiente
- **THEN** el siguiente se muestra completo, con imagen y respuestas, sin esperar a la red

#### Scenario: Ir al siguiente tras unos minutos
- **WHEN** un visitante ve un dibujo durante 3 minutos y pulsa la flecha al siguiente
- **THEN** el texto, el nombre y la fecha del siguiente se muestran al momento, y sus respuestas se vuelven a pedir antes de mostrarse

#### Scenario: Pulsar durante la preparación
- **WHEN** un visitante pulsa la flecha mientras su dibujo aún se está preparando
- **THEN** el sitio espera a esa misma preparación, sin repetir las peticiones
