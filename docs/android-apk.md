# Android APK Build (Self-Hosted NemesisAI)

Diese App kann als Android-APK gebaut werden, ohne Replit-Abhängigkeiten.

## Option A: APK per GitHub Actions (empfohlen)

1. Repository auf GitHub öffnen.
2. **Actions** -> **Build Android APK**.
3. Workflow manuell starten (**Run workflow**).
4. `cap_server_url` auf deine Live-URL setzen, z. B.:
   - `https://nemesis.example.com`
5. Warten, bis der Job fertig ist.
6. Artifact **nemesisai-android-apk** herunterladen.
7. Die Datei `app-debug.apk` auf dein Handy kopieren und installieren.

## Option B: Lokal auf Linux-Server bauen

Voraussetzungen:
- Node.js 20+
- Java 21
- Android SDK + Gradle-Toolchain

Dann:

```bash
npm ci
export CAP_SERVER_URL="https://nemesis.example.com"
npm run apk:build
```

APK-Ausgabe:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Wichtige Hinweise

- Für eine voll funktionsfähige App sollte `CAP_SERVER_URL` auf deine produktive NemesisAI-Instanz zeigen.
- Für Store-Release brauchst du später ein signiertes Release-Build (nicht nur `debug`).
