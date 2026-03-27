---
fecha: 2026-03-27
dimension: Manual-Tecnico
tags: [ZTE-Open, FirefoxOS, Sideload, WebApps]
---

# Guía de Instalación de WebApps (Sideload) en ZTE Open (Firefox OS 2.0)

Esta guía documenta el proceso para instalar aplicaciones "empaquetadas" (Packaged Apps) de forma nativa en el ZTE Open, evitando el uso del navegador y logrando que aparezcan en el lanzador (Launcher) con permisos de sistema.

## 1. Estructura de la Aplicación
Una aplicación de Firefox OS debe contener al menos estos archivos en su raíz:
- `manifest.webapp`: Metadatos de la app (Nombre, Iconos, Permisos).
- `index.html`: Punto de entrada.
- `app.js`: Lógica de la aplicación (usar ES5 puro).
- `style.css`: Estilos visuales (preferiblemente diseños para 320x480).

## 2. Empaquetado
Los archivos deben comprimirse en un archivo `.zip` (por convención `application.zip`) asegurándose de que el `manifest.webapp` esté en la **raíz** del archivo, no dentro de una subcarpeta.

```bash
cd mi_app/
zip -r application.zip ./*
```

## 3. Preparación del Dispositivo (ADB)
Conectar el ZTE Open mediante USB y verificar la conexión:
```bash
adb devices
# Debería aparecer como 'full_inari' o similar.
```

## 4. Despliegue de Archivos
Crear un directorio en la partición de datos del teléfono y subir los archivos. Se recomienda usar el sufijo `.gaiamobile.org` para máxima compatibilidad con el sistema.

```bash
ID_APP="mi_app.gaiamobile.org"
adb shell mkdir -p /data/local/webapps/$ID_APP
adb push application.zip /data/local/webapps/$ID_APP/
adb push manifest.webapp /data/local/webapps/$ID_APP/
```

## 5. Registro en el Sistema (`webapps.json`)
El paso más crítico es registrar la app en el archivo maestro `/data/local/webapps/webapps.json`.

### Protocolo de Edición Segura:
1. **Detener B2G**: `adb shell stop` (esto congela la interfaz gráfica).
2. **Descargar JSON**: `adb pull /data/local/webapps/webapps.json`
3. **Editar**: Añadir una entrada para la app. Ejemplo de entrada mínima:
```json
"mi_app.gaiamobile.org": {
  "origin": "app://mi_app.gaiamobile.org",
  "installOrigin": "app://mi_app.gaiamobile.org",
  "manifestURL": "app://mi_app.gaiamobile.org/manifest.webapp",
  "localId": 1050, 
  "appStatus": 3,
  "basePath": "/data/local/webapps",
  "id": "mi_app.gaiamobile.org",
  "installState": "installed",
  "name": "Mi App"
}
```
*Nota: `localId` debe ser un número único no usado por otra app. `appStatus: 3` otorga permisos de aplicación certificada.*

4. **Subir JSON**: `adb push webapps.json /data/local/webapps/webapps.json`
5. **Sincronizar y Reiniciar**: `adb shell sync && adb shell start`

## 6. Resolución de Problemas (Troubleshooting)
- **La app no aparece**: Reiniciar físicamente el teléfono. El launcher de la versión 2.0 a veces solo escanea nuevas apps en el arranque.
- **Error de permisos**: Asegurarse de que el `manifest.webapp` defina los permisos necesarios (ej. `vibration`) y que el `appStatus` en el JSON sea `2` (Privileged) o `3` (Certified).
- **La pantalla se queda en blanco**: El motor Gecko es antiguo (ES5). Revisar que no haya `let`, `const`, o funciones flecha (`=>`) en el código JS.

---
*Documentado por Gemini CLI en Marzo de 2026 tras el éxito del proyecto SquatLock.*
