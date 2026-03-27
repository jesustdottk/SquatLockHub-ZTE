#!/bin/bash

# --- Configuración ---
APP_ID="squat.gaiamobile.org"
SRC_DIR="src"
BUILD_DIR="build"
REMOTE_PATH="/data/local/webapps/$APP_ID"

echo "🚀 Iniciando despliegue de SquatLock Hub en ZTE Open..."

# 1. Empaquetar la aplicación
echo "📦 Comprimiendo archivos desde $SRC_DIR..."
cd $SRC_DIR
zip -r ../$BUILD_DIR/application.zip ./*
cd ..

# 2. Verificar conexión ADB
DEVICE_STATUS=$(adb get-state 2>/dev/null)
if [ "$DEVICE_STATUS" != "device" ]; then
    echo "❌ Error: ZTE Open no detectado por ADB. Conecta el dispositivo y activa la depuración USB."
    exit 1
fi

# 3. Subir archivos al dispositivo
echo "📤 Subiendo aplicación a $REMOTE_PATH..."
adb shell mkdir -p $REMOTE_PATH
adb push $BUILD_DIR/application.zip $REMOTE_PATH/application.zip
adb push $SRC_DIR/manifest.webapp $REMOTE_PATH/manifest.webapp

# 4. Reiniciar interfaz gráfica (B2G)
echo "🔄 Reiniciando B2G para aplicar cambios..."
adb shell stop
adb shell start

echo "✅ Despliegue completado con éxito. ¡Revisa tu ZTE Open!"
