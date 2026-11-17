# ui-localization Specification

## Purpose

Permite que todos los textos de la interfaz, sus plurales y el formato de las fechas dependan del idioma elegido en la configuración del sitio.

## Requirements

### Requirement: El idioma de la interfaz se elige en la configuración
Todos los textos fijos de la interfaz (contadores, nombre genérico, navegación, mensajes de error y de estado vacío) SHALL salir de un diccionario del idioma configurado. El sitio SHALL incluir al menos el diccionario `gl`, que es el idioma por defecto. La configuración SHALL poder sobrescribir cadenas sueltas.

#### Scenario: Idioma por defecto
- **WHEN** la configuración no indica idioma
- **THEN** la interfaz se muestra en galego, con "Fiz feliz a N amigas" y "o caderno"

#### Scenario: Cadena sobrescrita
- **WHEN** la configuración sobrescribe el nombre genérico con "a casa"
- **THEN** las respuestas del cuaderno sin tag de la lista se firman "a casa"

#### Scenario: Idioma sin diccionario
- **WHEN** la configuración indica un idioma sin diccionario incluido
- **THEN** la interfaz usa el diccionario `gl`

### Requirement: Los contadores respetan el plural del idioma
Los textos con número SHALL elegir su forma (singular, plural u otras) según las reglas de plural del idioma configurado.

#### Scenario: Singular y plural en galego
- **WHEN** el contador de likes vale 1 y después 2
- **THEN** se muestra "Fiz feliz a 1 amiga" y "Fiz feliz a 2 amigas"

### Requirement: Fecha relativa
Las fechas SHALL mostrarse como "agora" por debajo de 60 segundos, y después en minutos, horas, días (menos de 30) y meses (de 30 días, menos de 365), con las unidades y el patrón del idioma (en `gl`, "há {t}"). "agora" y la fecha corta NO SHALL llevar el patrón. A partir de 365 días SHALL mostrarse la fecha corta en el formato del idioma.

#### Scenario: Hace 16 horas
- **WHEN** una respuesta se publicó hace 16 horas y 20 minutos
- **THEN** su fecha se muestra como "há 16 h" en galego

#### Scenario: Hace unos segundos
- **WHEN** una respuesta se publicó hace 20 segundos
- **THEN** su fecha se muestra como "agora", sin el patrón

#### Scenario: Hace más de un año
- **WHEN** un dibujo se publicó hace 400 días
- **THEN** su fecha se muestra como fecha corta del idioma, no en meses

#### Scenario: Fecha no válida
- **WHEN** `createdAt` no se puede interpretar como fecha
- **THEN** no se muestra fecha y el resto se renderiza

### Requirement: Fecha absoluta en un tooltip
Toda fecha relativa SHALL llevar la fecha y la hora absolutas, en el formato corto del idioma, como tooltip, y la fecha en formato máquina (`datetime`).

#### Scenario: Pasar el ratón por la fecha
- **WHEN** un visitante pasa el ratón por "há 2 d"
- **THEN** ve la fecha y la hora absolutas de publicación
