# Spec Delta

## MODIFIED Requirements

### Requirement: El idioma de la interfaz se elige en la configuración
Todos los textos fijos de la interfaz (contadores, nombre genérico, navegación, mensajes de error y de estado vacío) SHALL salir de un diccionario del idioma configurado. El sitio SHALL incluir al menos el diccionario `gl`, que es el idioma por defecto. La configuración SHALL poder sobrescribir cadenas sueltas.

#### Scenario: Idioma por defecto
- **WHEN** la configuración no indica idioma
- **THEN** la interfaz se muestra en galego, con "Fiz feliz a N amigas 🥰" y "o caderno"

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
- **THEN** se muestra "Fiz feliz a 1 amiga 🥰" y "Fiz feliz a 2 amigas 🥰"
