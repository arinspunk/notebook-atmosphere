# Spec Delta

## MODIFIED Requirements

### Requirement: Estilos solo desde hojas del propio sitio
Los estilos SHALL cargarse solo desde hojas de estilo servidas por el propio sitio. El `index.html` generado para publicar NO SHALL contener elementos `<style>` ni atributos `style`. Los estilos que el código asigna en ejecución por CSSOM (como la proporción de las miniaturas del índice) no cuentan como estilos en línea del HTML. La forma cuadrada del hueco de la imagen del dibujo SHALL venir de la hoja de estilos, no del código.

#### Scenario: HTML publicado
- **WHEN** se genera el sitio publicable
- **THEN** su `index.html` no tiene `<style>` ni atributos `style`, y enlaza una hoja de estilos del propio sitio

#### Scenario: Proporción reservada sin atributo en el HTML
- **WHEN** se muestra un dibujo con imagen en el sitio publicado, con una CSP que no permite estilos en línea
- **THEN** su hueco es cuadrado, y ni el hueco ni la imagen llevan un atributo `style`

## ADDED Requirements

### Requirement: La hoja del dibujo crece sin cortes
La página de un dibujo SHALL mostrarse como una hoja de cuaderno con anillas de espiral en el borde izquierdo. Las anillas SHALL continuar con el mismo paso a lo largo de toda la hoja, sea cual sea su altura, sin saltos, sin repetir la sombra ni el borde de la hoja en mitad de ella.

#### Scenario: Dibujo con texto corto
- **WHEN** se muestra un dibujo con una línea de texto
- **THEN** la hoja tiene anillas de arriba abajo, con el mismo paso

#### Scenario: Dibujo con texto largo
- **WHEN** se muestra un dibujo cuyo texto ocupa 40 líneas
- **THEN** la hoja crece a lo alto y las anillas siguen con el mismo paso hasta el final, sin cortes ni sombras intermedias

### Requirement: Fuentes propias ligeras
Las fuentes de la interfaz SHALL servirse desde el propio sitio, en un formato comprimido para web y con un peso máximo de 100 KB por fichero, y SHALL cubrir los caracteres de galego, castellano y portugués. Mientras se cargan, el texto SHALL verse con una fuente del sistema.

#### Scenario: Caracteres de los textos
- **WHEN** un texto lleva "ñ", "ç", "ã", "õ", "á" o "ü"
- **THEN** se muestra con la fuente del sitio, no con una de reserva

#### Scenario: Emojis
- **WHEN** un texto lleva un emoji
- **THEN** el emoji se muestra con la fuente de emojis del sistema

#### Scenario: Red lenta
- **WHEN** la fuente aún no ha llegado
- **THEN** el texto ya se ve con una fuente del sistema y cambia cuando llega

### Requirement: Textos con contraste suficiente
Todo texto de la interfaz, enlaces incluidos, SHALL tener un contraste de al menos 4,5:1 con el fondo sobre el que se muestra, y el indicador de foco al menos 3:1. Los colores puramente decorativos quedan fuera de esta regla, pero NO SHALL usarse para texto ni para el foco.

#### Scenario: Color de acento decorativo
- **WHEN** el token de acento tiene un contraste menor de 4,5:1 con el fondo
- **THEN** ningún texto, enlace ni foco usa ese token

#### Scenario: Cambio de un color de texto en un fork
- **WHEN** alguien cambia un token de color de texto a un valor con contraste insuficiente
- **THEN** la comprobación de estilos falla
