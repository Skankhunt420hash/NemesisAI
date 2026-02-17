#!/usr/bin/env bash
set -euo pipefail

if [ ! -d "android" ]; then
  npx cap add android
fi

npx cap sync android
