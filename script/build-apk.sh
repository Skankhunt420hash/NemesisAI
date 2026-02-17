#!/usr/bin/env bash
set -euo pipefail

npm run build
bash script/prepare-android.sh

(
  cd android
  ./gradlew assembleDebug
)

echo "APK erstellt: android/app/build/outputs/apk/debug/app-debug.apk"
