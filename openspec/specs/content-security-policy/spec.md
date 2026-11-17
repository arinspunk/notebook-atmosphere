# content-security-policy Specification

## Purpose

Define la política de seguridad de contenido (CSP) del sitio publicado. Fija qué orígenes pueden aportar scripts, estilos, fuentes, imágenes y conexiones, para que en un sitio de niños no se cargue ni se ejecute nada que no sea del propio sitio o de los servicios atproto configurados.

## Requirements

### Requirement: Política por defecto cerrada
El sitio publicado SHALL enviar en todas sus rutas una cabecera `Content-Security-Policy` con `default-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'` y `object-src 'none'`. Todo tipo de recurso no permitido expresamente en este spec SHALL quedar bloqueado.

#### Scenario: Recurso de un origen no permitido
- **WHEN** la página intenta cargar un recurso de un origen que la política no permite
- **THEN** el navegador lo bloquea

#### Scenario: Insertar el sitio en otra página
- **WHEN** otra web incrusta el sitio en un `<iframe>`
- **THEN** el navegador no lo muestra

### Requirement: Scripts y estilos solo del propio sitio
La política SHALL permitir scripts y hojas de estilo solo del propio origen (`'self'`) y NO SHALL incluir `'unsafe-inline'` ni `'unsafe-eval'` en ninguna directiva.

#### Scenario: Estilo en línea inyectado
- **WHEN** un texto de un post consigue de algún modo añadir un `<style>` o un atributo `style` a la página
- **THEN** el navegador no lo aplica

#### Scenario: Página con estilos
- **WHEN** se abre el sitio publicado
- **THEN** la hoja de estilos propia se aplica y la consola no informa de ninguna violación de la CSP

### Requirement: Fuentes e imágenes propias
La política SHALL permitir fuentes solo del propio origen e imágenes del propio origen y del CDN de imágenes del AppView (`https://cdn.bsky.app`).

#### Scenario: Fuente autoalojada
- **WHEN** una hoja del sitio declara una fuente servida por el propio sitio
- **THEN** la fuente se carga

#### Scenario: Fuente de un tercero
- **WHEN** una hoja intenta cargar una fuente de otro origen
- **THEN** el navegador la bloquea

#### Scenario: Imagen propia y dibujo
- **WHEN** la página muestra una imagen servida por el propio sitio y un dibujo de `cdn.bsky.app`
- **THEN** se cargan las dos

### Requirement: Conexiones solo con los servicios configurados
La política SHALL permitir conexiones (`connect-src`) solo con el PDS configurado y los AppViews que admite la configuración (Bluesky y Blacksky), ni más ni menos.

#### Scenario: Petición al PDS
- **WHEN** el sitio pide los likes al PDS configurado
- **THEN** la petición no es bloqueada

#### Scenario: Cambio de PDS sin tocar la política
- **WHEN** se cambia `pdsUrl` a otro origen y no se actualiza la política
- **THEN** la comprobación de la política falla antes de publicar

#### Scenario: Cambio de AppView
- **WHEN** se cambia `appviewUrl` de Bluesky a Blacksky
- **THEN** las peticiones al AppView no son bloqueadas, sin tocar la política

### Requirement: Misma política en la previsualización local
La previsualización local del sitio construido SHALL enviar la misma cabecera `Content-Security-Policy` que el sitio publicado, obtenida de la misma definición, para que cualquier bloqueo se vea antes de publicar.

#### Scenario: Recurso bloqueado en local
- **WHEN** un cambio añade un recurso que la política no permite y se revisa con la previsualización local
- **THEN** el navegador lo bloquea igual que lo haría en el sitio publicado

#### Scenario: Cambio de la política
- **WHEN** se modifica la política en su definición única
- **THEN** la previsualización local y el sitio publicado usan la política nueva sin editar ningún otro fichero
