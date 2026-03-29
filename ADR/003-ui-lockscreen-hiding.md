# Local ADR 003: Ocultación Total de UI en Bloqueo

## Estado
**Aceptado**

## Contexto
En las primeras versiones de SquatLock Hub, al activarse la alarma, se mostraba la pantalla de bloqueo encimada sobre el temporizador de trabajo. Esto causaba errores visuales graves y permitía al usuario ver información irrelevante durante la fase de bloqueo.

## Decisión
Se ha decidido realizar una ocultación total del contenedor principal (`#app`) mediante CSS/JavaScript en cuanto se dispara la alarma (`triggerAlarm`). Al mismo tiempo, se desoculta la capa `#lock-screen`.

## Consecuencias
- **Positivas**: Interfaz limpia y focalizada. Eliminación de fallos de renderizado en cascada de Gecko 32 al no tener que gestionar capas superpuestas complejas.
- **Negativas**: Mayor responsabilidad del desarrollador para re-mostrar el contenedor principal tras finalizar las sentadillas (SQUATS DONE).
- **Aplicabilidad**: Exclusivo para la gestión de estados críticos de SquatLock Hub.
