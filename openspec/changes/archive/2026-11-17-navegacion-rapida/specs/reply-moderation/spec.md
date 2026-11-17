# Spec Delta

## ADDED Requirements

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
