# Local ADR 002: Temática y Sonido 8-Bit (Mario Bros.)

## Estado
**Aceptado**

## Contexto
El ZTE Open tiene recursos de hardware limitados (CPU y RAM). Reproducir archivos de audio pesados (WAV/MP3) puede causar latencia o fallos de memoria. Además, se busca una interfaz que transmita urgencia y gamificación.

## Decisión
Se ha decidido utilizar una estética de 8 bits inspirada en Mario Bros. para todos los eventos sonoros (Inicio, Alarma de Bowser, Victoria). Estos sonidos se generan mediante síntesis pura de Web Audio (Ondas Square/Sine).

## Consecuencias
- **Positivas**: Carga de memoria casi nula (no hay archivos externos). Feedback auditivo instantáneo y con "personalidad" que motiva al usuario a cumplir el reto.
- **Negativas**: Calidad de audio limitada por la síntesis básica; puede sonar estridente si no se diseña con envolventes suaves (ADSR).
- **Aplicabilidad**: Exclusivo para la interfaz de usuario de SquatLock Hub en su versión de foco.
