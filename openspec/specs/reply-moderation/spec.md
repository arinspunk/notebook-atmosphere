# reply-moderation Specification

## Purpose

Garantiza que en el sitio solo aparezcan respuestas revisadas por el cuaderno: decide si cada respuesta de un dibujo es visible, está oculta o queda pendiente, y de dónde salen los datos de aprobación.

## Requirements

### Requirement: Las respuestas ocultadas en el threadgate no se ven
Una respuesta cuya AT-URI esté en `hiddenReplies` del threadgate del dibujo SHALL estar oculta, aunque la haya escrito el cuaderno o tenga su like. El threadgate SHALL leerse del repositorio del cuaderno en su PDS, no del AppView. Las entradas de `hiddenReplies` que no sean cadenas SHALL ignorarse.

#### Scenario: Respuesta aprobada y después ocultada
- **WHEN** el cuaderno dio like a una respuesta y además la ocultó con "Ocultar para todos"
- **THEN** la respuesta no se ve

#### Scenario: AppView sin threadgate
- **WHEN** el AppView configurado no devuelve el `threadgate` del dibujo y una respuesta con like está en `hiddenReplies` del PDS
- **THEN** la respuesta no se ve

#### Scenario: Lista con valores no válidos
- **WHEN** `hiddenReplies` mezcla URIs con valores que no son cadenas
- **THEN** se ocultan solo las respuestas de esas URIs y la página se muestra sin errores

### Requirement: Las respuestas con etiquetas de moderación que ocultan no se ven
Una respuesta SHALL estar oculta si el post, o la cuenta de su autor, tiene alguna de las etiquetas `!hide`, `!no-promote`, `porn`, `sexual`, `graphic-media` o `nudity`, aunque tenga el like del cuaderno. El sitio SHALL pedir al AppView, sea cual sea, las etiquetas del servicio de moderación de Bluesky. Las etiquetas del post del dibujo NO SHALL afectar a su visibilidad.

#### Scenario: Cuenta etiquetada después del like
- **WHEN** el cuaderno aprobó una respuesta y más tarde la cuenta de su autor recibe la etiqueta `porn`
- **THEN** la respuesta no se ve

#### Scenario: Dibujo con falso positivo
- **WHEN** el post del dibujo tiene la etiqueta `nudity`
- **THEN** el dibujo se sigue mostrando

### Requirement: Sin padre visible no se ve
Una respuesta cuyo padre no sea el dibujo ni una respuesta visible SHALL estar oculta, igual que cualquier respuesta por debajo de ella. Las respuestas borradas, bloqueadas o inaccesibles cuentan como no visibles.

#### Scenario: Respuesta del cuaderno a una pendiente
- **WHEN** el cuaderno responde a una respuesta que no tiene su like
- **THEN** ni la respuesta pendiente ni la del cuaderno se ven

#### Scenario: Padre borrado
- **WHEN** una respuesta aprobada cuelga de una respuesta borrada
- **THEN** la respuesta aprobada no se ve

### Requirement: Solo se ven las respuestas del cuaderno o con su like
Una respuesta que no esté oculta SHALL ser visible si la escribe la cuenta del cuaderno o si el cuaderno le dio like; en cualquier otro caso SHALL quedar pendiente y no verse. Seguir al autor NO SHALL aprobar sus respuestas.

#### Scenario: Respuesta con like
- **WHEN** un desconocido responde al dibujo y el cuaderno le da like
- **THEN** la respuesta se ve

#### Scenario: Respuesta sin like
- **WHEN** una cuenta a la que el cuaderno sigue responde al dibujo y el cuaderno no le da like
- **THEN** la respuesta no se ve

#### Scenario: Respuesta del cuaderno
- **WHEN** el cuaderno responde directamente al dibujo
- **THEN** la respuesta se ve sin necesidad de like

### Requirement: El like aprueba solo el contenido que se revisó
Un like del cuaderno SHALL aprobar una respuesta solo si el `subject.cid` del like coincide con el `cid` actual de esa respuesta.

#### Scenario: Post reescrito después del like
- **WHEN** el autor reescribe el record de su respuesta con el mismo rkey después del like y el `cid` cambia
- **THEN** la respuesta queda pendiente

### Requirement: Los likes se leen del repositorio del cuaderno
Los likes que aprueban respuestas SHALL leerse de los records `app.bsky.feed.like` del repositorio del cuaderno en su PDS, no de datos calculados por el AppView. Quitar un like SHALL dejar de aprobar la respuesta como tarde 24 horas después en cualquier navegador.

#### Scenario: AppView sin rootAuthorLike
- **WHEN** el AppView configurado no devuelve `threadContext.rootAuthorLike`
- **THEN** las respuestas con like del cuaderno se ven igualmente

#### Scenario: Like retirado
- **WHEN** el cuaderno quita el like a una respuesta visible
- **THEN** pasadas como mucho 24 horas, la respuesta ya no se ve en ningún navegador

### Requirement: Ante un fallo, nada sin revisar se ve
Si no se pueden obtener los likes del cuaderno o su threadgate (salvo porque no exista), todas las respuestas que no sean del cuaderno SHALL tratarse como pendientes. Los datos de moderación incompletos NUNCA SHALL hacer visible una respuesta.

#### Scenario: PDS caído
- **WHEN** la lectura de likes del PDS falla y no hay caché
- **THEN** solo se ven las respuestas del cuaderno que cumplan el resto de reglas

#### Scenario: Threadgate no disponible
- **WHEN** la lectura del threadgate en el PDS falla con un error que no es "no existe"
- **THEN** solo se ven las respuestas del cuaderno que cumplan el resto de reglas

### Requirement: Las respuestas se deciden con datos recientes
Las respuestas que se muestran al abrir o cambiar de dibujo SHALL decidirse con un hilo (con sus etiquetas) y un threadgate cuya lectura empezó como mucho 60 segundos antes, y con los likes consultados en el PDS en esa misma carga. Quitar un like sigue rigiéndose por el plazo de 24 horas. Si la app estuvo oculta más de 10 minutos, al volver SHALL mostrar la página actual con datos leídos de nuevo, catálogo incluido.

#### Scenario: Ocultar y navegar
- **WHEN** el cuaderno oculta una respuesta y, más de un minuto después, alguien navega a ese dibujo
- **THEN** la respuesta no se ve

#### Scenario: Preparación antigua
- **WHEN** un dibujo vecino se preparó hace 2 minutos y entretanto el cuaderno ocultó una de sus respuestas
- **THEN** al pulsar su flecha se vuelven a leer los datos y la respuesta no se ve

#### Scenario: Recargar
- **WHEN** el cuaderno oculta una respuesta y alguien recarga la página del dibujo
- **THEN** la respuesta no se ve

#### Scenario: Pestaña abierta de un día para otro
- **WHEN** la app se queda abierta en segundo plano por la noche, el cuaderno oculta una respuesta y a la mañana siguiente se vuelve a la pestaña
- **THEN** la página se vuelve a mostrar con datos nuevos y la respuesta ocultada no se ve

#### Scenario: Vuelta rápida
- **WHEN** la app pasa 2 minutos en segundo plano y se vuelve a ella
- **THEN** la página se queda como estaba, sin volver a cargarse
