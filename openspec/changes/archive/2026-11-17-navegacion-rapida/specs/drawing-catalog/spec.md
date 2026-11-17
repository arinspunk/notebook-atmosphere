# Spec Delta

## ADDED Requirements

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
