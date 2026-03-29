#!/bin/bash
# Despliegue ROBUSTO de SquatLock Hub v2.4-SANE (ZTE Open)
APP_NAME="SquatLock"
APP_ID="squat.gaiamobile.org"
BASE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRC_DIR="$BASE_DIR/src"
BUILD_DIR="$BASE_DIR/build"

echo "🚀 Iniciando despliegue ROBUSTO de $APP_NAME v2.4-SANE..."

# 1. Empaquetado Correcto (manifest en raíz)
mkdir -p "$BUILD_DIR"
cd "$SRC_DIR"
zip -r "$BUILD_DIR/application.zip" ./*
cd "$BASE_DIR"

# 2. Preparar Sistema
echo "🛑 Deteniendo B2G..."
adb shell stop

# 3. Descargar y respaldar webapps.json
echo "📥 Descargando base de datos de apps..."
adb pull /data/local/webapps/webapps.json "$BUILD_DIR/webapps.json"
cp "$BUILD_DIR/webapps.json" "$BUILD_DIR/webapps.json.bak"

# 4. Inyectar App en JSON mediante jq (si no existe o actualizar)
echo "💉 Registrando $APP_ID en el sistema..."
# Intentar obtener localId existente o buscar el máximo + 1
EXISTING_ID=$(jq -r ".[\"$APP_ID\"].localId // empty" "$BUILD_DIR/webapps.json")

if [ -z "$EXISTING_ID" ]; then
    MAXID=$(jq '[.[] | .localId] | max' "$BUILD_DIR/webapps.json")
    NEWID=$((MAXID + 1))
    log_msg="Nueva instalación (localId: $NEWID)"
else
    NEWID=$EXISTING_ID
    log_msg="Actualización (localId: $NEWID)"
fi

echo "📊 $log_msg"

jq --arg id "$APP_ID" --arg name "$APP_NAME" --arg localId "$NEWID" \
'.[$id] = {
  "origin": ("app://" + $id),
  "installOrigin": ("app://" + $id),
  "manifestURL": ("app://" + $id + "/manifest.webapp"),
  "localId": ($localId | tonumber),
  "appStatus": 3,
  "basePath": "/data/local/webapps",
  "id": $id,
  "installState": "installed",
  "name": $name
}' "$BUILD_DIR/webapps.json" > "$BUILD_DIR/webapps.json.tmp" && mv "$BUILD_DIR/webapps.json.tmp" "$BUILD_DIR/webapps.json"

# 5. Desplegar archivos al dispositivo
echo "📤 Subiendo archivos a /data/local/webapps/$APP_ID..."
adb shell mkdir -p "/data/local/webapps/$APP_ID"
adb push "$BUILD_DIR/application.zip" "/data/local/webapps/$APP_ID/"
adb push "$SRC_DIR/manifest.webapp" "/data/local/webapps/$APP_ID/"
adb push "$BUILD_DIR/webapps.json" "/data/local/webapps/webapps.json"

# 6. Sincronizar y Reiniciar
echo "🔄 Sincronizando y Reiniciando..."
adb shell sync
adb shell start

echo "✅ $APP_NAME v2.4-SANE desplegado con éxito."
