#!/bin/bash
# Despliegue Robusto de SQUAT LAB (Siguiendo Manual Sideload)
APP_NAME="Squat Lab"
APP_ID="squatlab.gaiamobile.org"
DEV_PATH="/home/jesustdottk/Documentos/Obsidian/90_Code/ZTE_Apps/SquatLockHub/dev"

echo "🚀 Iniciando despliegue robusto de $APP_NAME..."

# 1. Empaquetado Correcto (manifest en raíz)
cd "$DEV_PATH/squat_lab"
zip -r ../application.zip ./*

# 2. Preparar Sistema
echo "🛑 Deteniendo B2G..."
adb shell stop

# 3. Descargar y respaldar webapps.json
echo "📥 Descargando base de datos de apps..."
adb pull /data/local/webapps/webapps.json "$DEV_PATH/webapps.json"
cp "$DEV_PATH/webapps.json" "$DEV_PATH/webapps.json.bak"

# 4. Inyectar App en JSON mediante jq
echo "💉 Inyectando metadatos de $APP_ID..."
MAXID=$(jq '[.[] | .localId] | max' "$DEV_PATH/webapps.json")
NEWID=$((MAXID + 1))

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
}' "$DEV_PATH/webapps.json" > "$DEV_PATH/webapps.json.tmp" && mv "$DEV_PATH/webapps.json.tmp" "$DEV_PATH/webapps.json"

# 5. Desplegar archivos al dispositivo
echo "📤 Subiendo archivos..."
adb shell mkdir -p "/data/local/webapps/$APP_ID"
adb push "$DEV_PATH/application.zip" "/data/local/webapps/$APP_ID/"
adb push "$DEV_PATH/squat_lab/manifest.webapp" "/data/local/webapps/$APP_ID/"
adb push "$DEV_PATH/webapps.json" "/data/local/webapps/webapps.json"

# 6. Sincronizar y Reiniciar
echo "🔄 Sincronizando y Reiniciando..."
adb shell sync
adb shell start

echo "✅ $APP_NAME desplegado con éxito (localId: $NEWID)."
