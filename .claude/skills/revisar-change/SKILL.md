---
name: revisar-change
description: Revisa los artefactos de un change de OpenSpec de este proyecto (proposal, design, specs, tasks) antes de implementarlo. Úsala cuando pidan "revisa el change", "qué te parece este change" o antes de un apply. No sustituye a openspec-verify-change, que compara el código ya implementado con los artefactos.
---

Revisión crítica de un change de OpenSpec **antes** de implementarlo. El objetivo es encontrar lo que haría fallar la implementación o romper una garantía del proyecto, no reescribir el estilo de los artefactos.

## 1. Situarse

1. Elegir el change: si no lo nombran, el único activo en `openspec/changes/` (fuera de `archive/`). Si hay varios, preguntar.
2. Leer `CLAUDE.md`, `openspec/config.yaml` y las specs vigentes de las capacidades que toca el change (`openspec/specs/<capacidad>/spec.md`).
3. Leer todos los artefactos del change.
4. Ejecutar `npx -y @fission-ai/openspec@latest validate <change> --strict` (o `openspec validate` si está instalado).

## 2. Comprobar contra el código real

Las suposiciones del design ("hoy X hace Y", "en 3 sitios", "jsdom serializa…") se comprueban en el código, no se dan por buenas. Si una suposición técnica decide el diseño y se puede probar en un minuto (un build de Vite, un test pequeño, una llamada real), se prueba en una copia de trabajo, nunca en el proyecto.

## 3. Lista de comprobación del proyecto

- **Fallar cerrado:** ¿algún camino nuevo puede mostrar una respuesta ajena con datos incompletos, viejos o de una fuente no autoritativa (AppView en vez de PDS)? ¿Se guarda en caché algo que convierte un fallo en un valor (mapa vacío, `null`)?
- **Frescura de la moderación:** si hay cachés nuevas, ¿cuál es la edad máxima de lo que se muestra? ¿Está escrita en una spec con escenarios? ¿La edad se cuenta desde la pieza más antigua?
- **Contenido ajeno y CSP:** nada de `innerHTML` ni de estilos en línea en el HTML; cualquier origen o recurso nuevo (fuente, imagen, CDN, `data:`) tiene su directiva en `netlify.toml`.
- **Estilos:** clases BEM en inglés, tokens semánticos y ningún color literal.
- **Idiomas:** artefactos, comentarios y documentación en inglés; interfaz en galego.
- **Pureza:** la lógica de decisión sigue en funciones puras con tests, separada del DOM y de la red.

## 4. Coherencia entre artefactos

- Proposal, design, specs y tasks dicen lo mismo (valores, plazos, nombres, formatos). Buscar contradicciones concretas: "la spec dice X y el design dice Y".
- Cada requisito tiene escenarios comprobables; los escenarios con números concretos coinciden con el design.
- Cada tarea tiene una verificación concreta que **fallaría** si la tarea estuviera mal hecha (por ejemplo, "falla si se pone temporalmente…"). Señalar las verificaciones que no pueden fallar.
- Lo que se queda fuera está dicho; los riesgos tienen mitigación o se aceptan explícitamente.

## 5. Proporcionalidad

Preguntarse si el change es más complejo de lo que exige su "Why". Si una parte del diseño existe solo para gestionar efectos de otra parte, proponer la alternativa más simple con sus pérdidas y sus ahorros.

## 6. Informe

En el idioma de la conversación, conciso, sin repetir lo que ya está bien salvo una o dos frases de valoración:

- **Importantes:** lo que rompe una garantía o haría fallar la implementación, con el fichero y la línea o sección.
- **Incoherencias:** contradicciones entre artefactos.
- **Menores / sugerencias.**

Cerrar ofreciendo aplicar los cambios a los artefactos y nombrar las decisiones que corresponden al autor. No editar nada hasta que lo confirme.
