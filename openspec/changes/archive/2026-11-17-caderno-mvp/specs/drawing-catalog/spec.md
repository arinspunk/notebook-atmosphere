# Spec Delta

## Purpose

Decide qué posts de la cuenta del cuaderno son dibujos, a quién se atribuyen, en qué orden aparecen y cómo se navega entre ellos y por el índice.

## ADDED Requirements

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
La página de un dibujo SHALL ofrecer enlaces al dibujo inmediatamente más antiguo y al inmediatamente más reciente según el orden del catálogo. El enlace que no tenga destino SHALL no mostrarse.

#### Scenario: Dibujo intermedio
- **WHEN** se muestra un dibujo que no es ni el más reciente ni el más antiguo
- **THEN** hay enlace al anterior y al siguiente

#### Scenario: Dibujo más reciente
- **WHEN** se muestra el dibujo más reciente
- **THEN** solo hay enlace al dibujo anterior (más antiguo)

### Requirement: Página de índice
El sitio SHALL tener una página de índice, enlazada desde la página de dibujo, que liste todos los dibujos en el orden del catálogo. Cada entrada SHALL mostrar la miniatura de la primera imagen (si la tiene), el nombre atribuido y la fecha, y enlazar a la página del dibujo.

#### Scenario: Abrir el índice
- **WHEN** un visitante abre el índice
- **THEN** ve todos los dibujos, cada uno con miniatura, nombre y fecha, y al pulsar uno llega a su página

#### Scenario: Dibujo sin imagen
- **WHEN** un dibujo no tiene imagen
- **THEN** su entrada del índice se muestra sin miniatura, con nombre y fecha
