# Spec Delta

## Purpose

Define cómo se presentan las respuestas visibles de un dibujo: agrupadas en tarjetas de un solo nivel, con texto, autoría y fecha, sin avatares ni contenido fuera del texto.

## ADDED Requirements

### Requirement: Una tarjeta por cada respuesta directa visible
Cada respuesta visible que responda directamente al dibujo SHALL abrir una tarjeta. Las tarjetas SHALL ordenarse por `createdAt`, de la más antigua a la más reciente.

#### Scenario: Dos respuestas directas
- **WHEN** el dibujo tiene dos respuestas directas visibles, de hace 16 h y de hace 3 h
- **THEN** se muestran dos tarjetas, primero la de hace 16 h

### Requirement: Los descendientes se aplanan en un solo nivel
Dentro de cada tarjeta, todas las respuestas visibles que cuelgan de la respuesta directa, a cualquier profundidad, SHALL mostrarse en un único nivel con sangría bajo ella, ordenadas por `createdAt` de la más antigua a la más reciente.

#### Scenario: Conversación de tres niveles
- **WHEN** A responde al dibujo, B responde a A y C responde a B, todas visibles
- **THEN** la tarjeta muestra A y, con la misma sangría, B y después C

#### Scenario: Hilo profundo
- **WHEN** una conversación dentro de una tarjeta tiene 20 niveles de respuestas visibles
- **THEN** todas aparecen en la tarjeta, sin cortarse

### Requirement: Cada respuesta muestra solo texto, nombre y fecha
Cada respuesta SHALL mostrar su texto, el nombre del autor y su fecha (`createdAt`). NO SHALL mostrarse avatar, imágenes, vídeo, tarjetas de enlace, citas ni contadores de la respuesta. Una respuesta visible sin texto SHALL mostrarse solo con nombre y fecha.

#### Scenario: Respuesta con texto e imagen
- **WHEN** una respuesta aprobada tiene texto y una imagen
- **THEN** se muestra el texto y no la imagen

#### Scenario: Sin avatar
- **WHEN** el autor de una respuesta tiene avatar
- **THEN** el avatar no se muestra

### Requirement: Los enlaces del texto se pueden pulsar
En el texto de las respuestas, los facets de enlace con esquema `http` o `https` SHALL mostrarse como enlaces que se abren en una pestaña nueva. Las menciones y los hashtags de autores ajenos SHALL mostrarse como texto, sin enlace.

#### Scenario: Enlace y mención
- **WHEN** una respuesta dice "mira https://example.org @abuela.bsky.social"
- **THEN** la URL es un enlace que abre en una pestaña nueva y la mención es texto sin enlace

#### Scenario: Esquema no web
- **WHEN** un facet de enlace apunta a `javascript:alert(1)`
- **THEN** ese fragmento se muestra como texto, sin enlace

### Requirement: Nombre del autor ajeno
Para respuestas de otras cuentas, el nombre SHALL ser su `displayName`; si está vacío o no existe, su `handle`.

#### Scenario: Autor sin displayName
- **WHEN** responde una cuenta sin `displayName` con handle `luzia.bsky.social`
- **THEN** se muestra "luzia.bsky.social"

### Requirement: Nombre y texto de las respuestas del cuaderno
Las respuestas del cuaderno SHALL firmarse con el nombre de la lista de configuración cuyo tag lleven (facets o `tags[]`, sin distinguir mayúsculas), o con el genérico "o caderno" si no llevan ninguno de la lista. Su texto SHALL mostrarse sin hashtags.

#### Scenario: Respuesta firmada por Naia
- **WHEN** el cuaderno responde "Obrigada, avó! #naia"
- **THEN** la respuesta se firma como "Naia" y su texto es "Obrigada, avó!"

#### Scenario: Respuesta sin tag de la lista
- **WHEN** el cuaderno responde sin ningún tag de la lista
- **THEN** la respuesta se firma como "o caderno"

### Requirement: Dibujo sin respuestas visibles
Si un dibujo no tiene ninguna respuesta visible, la página NO SHALL mostrar tarjetas ni indicar cuántas respuestas pendientes u ocultas hay.

#### Scenario: Solo respuestas pendientes
- **WHEN** todas las respuestas de un dibujo están pendientes
- **THEN** la página muestra el dibujo sin tarjetas y sin ningún aviso de respuestas pendientes
