# Local ADR 001: El Gesto 'Flip-to-Focus'

## Estado
**Aceptado**

## Contexto
El objetivo de **SquatLock Hub** no es solo un temporizador, sino un sistema de bio-hacking enfocado al foco profundo. Los botones táctiles tradicionales permiten al usuario seguir mirando la pantalla y distraerse justo antes de que el contador empiece.

## Decisión
Se ha decidido usar el sensor de gravedad (acelerómetro) para detectar cuándo el dispositivo es colocado boca abajo sobre una superficie. Solo este gesto iniciará la cuenta regresiva oficial y establecerá el mensaje de alarma del sistema.

## Consecuencias
- **Positivas**: Refuerza el compromiso psicológico del usuario con la tarea. Físicamente, el usuario deja de ver la pantalla para que la sesión comience.
- **Negativas**: Mayor consumo de batería por el monitoreo constante del acelerómetro (mitigado por el uso de `devicemotion` de bajo impacto).
- **Aplicabilidad**: Este ADR es EXCLUSIVO de SquatLock Hub y su lógica de presión psicológica.
