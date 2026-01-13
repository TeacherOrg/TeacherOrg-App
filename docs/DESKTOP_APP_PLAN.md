# TeacherOrg Desktop App - Implementierungsplan

## Ziel
React/Vite-App als downloadbare Desktop-Anwendung für **macOS** (Priorität) und **Windows** bereitstellen.

## Entscheidungen
- **Framework:** Tauri v2 (klein, schnell, native Mac-Integration)
- **Backend:** Remote PocketBase (teacherorg.com) - keine lokale Einbettung
- **Distribution:** Website-Download + später Mac App Store

---

## Architektur: Web + Desktop parallel

### Übersicht
```
┌─────────────────────────────────────────────────────────┐
│                 Gleicher React-Code                      │
│            (src/, components, hooks, etc.)               │
└─────────────────────────────────────────────────────────┘
                           │
                     git push / tag
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
    ┌─────────────┐                ┌──────────────┐
    │   Vercel    │                │GitHub Actions│
    │ (automatisch│                │ (bei v-Tag)  │
    │  bei push)  │                │              │
    └─────────────┘                └──────────────┘
           │                               │
           ▼                               ▼
    ┌─────────────┐                ┌──────────────┐
    │teacherorg.com               │ DMG + EXE    │
    │  (sofort)   │                │  Installer   │
    └─────────────┘                └──────────────┘
```

### Update-Verhalten

| Aspekt | Web (Vercel) | Desktop (Tauri) |
|--------|--------------|-----------------|
| Trigger | Jeder Push zu `main` | Git-Tag (z.B. `v6.9.5`) |
| Deployment | Automatisch, sofort | GitHub Release |
| User bekommt Update | Beim nächsten Seiten-Reload | App prüft beim Start |
| Rollback | Vercel Dashboard | Alte Version downloaden |

---

## Phase 1: Voraussetzungen installieren

### Rust installieren
```bash
# Windows (PowerShell)
winget install Rustlang.Rustup

# macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Plattform-Tools
- **macOS:** `xcode-select --install`
- **Windows:** Visual Studio Build Tools (C++ Workload)

### Tauri CLI
```bash
npm install -D @tauri-apps/cli@^2 @tauri-apps/api@^2
```

---

## Phase 2: Tauri initialisieren

```bash
npx tauri init
```

**Antworten:**
- App name: `TeacherOrg`
- Web assets: `../dist`
- Dev URL: `http://localhost:5173`
- Dev command: `npm run dev`
- Build command: `npm run build`

---

## Phase 3: Dateien anpassen

### 1. `package.json` - Scripts hinzufügen
```json
{
  "scripts": {
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### 2. `vite.config.js` - Tauri-Erkennung
```javascript
const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined;

server: {
  port: 5173,
  strictPort: true,
  open: !isTauri
}
```

### 3. `src/main.jsx` - HashRouter für Tauri
```javascript
import { BrowserRouter, HashRouter } from 'react-router-dom';

const isTauri = window.__TAURI__ !== undefined;
const Router = isTauri ? HashRouter : BrowserRouter;
```

### 4. `src-tauri/tauri.conf.json` - Hauptkonfiguration
```json
{
  "productName": "TeacherOrg",
  "identifier": "com.teacherorg.app",
  "version": "6.9.4",
  "app": {
    "windows": [{
      "title": "TeacherOrg",
      "width": 1400,
      "height": 900,
      "minWidth": 1024,
      "minHeight": 768
    }],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://teacherorg.com https://*.teacherorg.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'"
    }
  }
}
```

---

## Phase 4: App-Icons erstellen

1. Erstelle ein 1024x1024 PNG Icon
2. `npx tauri icon pfad/zum/icon.png`
3. Generiert automatisch alle benötigten Größen

---

## Phase 5: Code-Signing

### macOS (Apple Developer Program - $99/Jahr)
1. **Developer ID Application** Zertifikat erstellen
2. App-Specific Password für Notarisierung generieren
3. `tauri.conf.json` konfigurieren:
```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Dein Name (TEAMID)"
    }
  }
}
```

### Windows (Code Signing Zertifikat - ~$100-300/Jahr)
- **Option A:** EV-Zertifikat (sofort SmartScreen-Vertrauen)
- **Option B:** Standard-Zertifikat (baut Vertrauen auf)
- Anbieter: DigiCert, Sectigo, SSL.com

---

## Phase 6: Build & Test

### Entwicklung
```bash
npm run tauri:dev
```

### Produktion
```bash
npm run tauri:build
```

### Output
- **macOS:** `src-tauri/target/release/bundle/dmg/TeacherOrg.dmg`
- **Windows:** `src-tauri/target/release/bundle/nsis/TeacherOrg-setup.exe`

---

## Phase 7: Auto-Updates für Desktop

### 7.1 Tauri Updater einrichten

**Dependencies in `src-tauri/Cargo.toml`:**
```toml
[dependencies]
tauri = { version = "2", features = ["updater"] }
tauri-plugin-updater = "2"
```

**Konfiguration in `tauri.conf.json`:**
```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://teacherorg.com/api/updates/{{target}}/{{arch}}/{{current_version}}"
      ],
      "pubkey": "DEIN_PUBLIC_KEY"
    }
  }
}
```

### 7.2 Update-Signing-Keys generieren
```bash
npx tauri signer generate -w ~/.tauri/teacherorg.key
# Speichert Private Key lokal
# Public Key kommt in tauri.conf.json
```

### 7.3 Update-Server Endpoint

Der Endpoint `https://teacherorg.com/api/updates/{target}/{arch}/{version}` muss JSON zurückgeben:

```json
{
  "version": "6.9.5",
  "notes": "Bug fixes und neue Features",
  "pub_date": "2026-01-15T12:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "SIGNATUR_HIER",
      "url": "https://teacherorg.com/releases/TeacherOrg_6.9.5_aarch64.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "SIGNATUR_HIER",
      "url": "https://teacherorg.com/releases/TeacherOrg_6.9.5_x64.app.tar.gz"
    },
    "windows-x86_64": {
      "signature": "SIGNATUR_HIER",
      "url": "https://teacherorg.com/releases/TeacherOrg_6.9.5_x64-setup.nsis.zip"
    }
  }
}
```

### 7.4 Frontend Update-UI (optional)

```javascript
// src/utils/updater.js
export async function checkForUpdates() {
  if (!window.__TAURI__) return null;

  const { check } = await import('@tauri-apps/plugin-updater');
  const update = await check();

  if (update) {
    // Zeige Dialog: "Update verfügbar: v${update.version}"
    await update.downloadAndInstall();
    // App neustarten
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  }
}
```

---

## Phase 8: CI/CD Pipeline (GitHub Actions)

### 8.1 Workflow-Datei erstellen

**`.github/workflows/release-desktop.yml`:**
```yaml
name: Release Desktop App

on:
  push:
    tags:
      - 'v*'  # Triggert bei v6.9.5, v7.0.0, etc.

jobs:
  build-tauri:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Rust
        uses: dtolnay/rust-action@stable

      - name: Install dependencies
        run: npm ci

      - name: Build Tauri App
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # macOS Signing
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          # Update Signing
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
        with:
          tagName: v__VERSION__
          releaseName: 'TeacherOrg v__VERSION__'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

### 8.2 GitHub Secrets einrichten

In GitHub Repository → Settings → Secrets → Actions:

| Secret | Beschreibung |
|--------|--------------|
| `APPLE_SIGNING_IDENTITY` | "Developer ID Application: Name (TEAMID)" |
| `APPLE_ID` | Apple Developer E-Mail |
| `APPLE_PASSWORD` | App-spezifisches Passwort |
| `APPLE_TEAM_ID` | 10-stellige Team ID |
| `TAURI_SIGNING_PRIVATE_KEY` | Update-Signing Key |

---

## Release-Workflow (praktisch)

### Normales Update (Web + Desktop)

```bash
# 1. Code ändern und committen
git add .
git commit -m "Fix: Login-Bug behoben"

# 2. Push für Web-Update (Vercel)
git push origin main
# → Web ist sofort aktualisiert

# 3. Tag für Desktop-Release
git tag v6.9.5
git push origin v6.9.5
# → GitHub Actions baut automatisch
# → Release-Draft erscheint in GitHub
# → Review und publizieren
```

### Nur Web-Update (kein Desktop)
```bash
git push origin main
# Fertig - Vercel deployed automatisch
```

### Nur Desktop-Update (selten)
```bash
git tag v6.9.5
git push origin v6.9.5
```

---

## Kritische Dateien

| Datei | Änderung |
|-------|----------|
| `package.json` | Tauri-Dependencies + Scripts |
| `vite.config.js` | Tauri-Umgebungserkennung, strictPort |
| `src/main.jsx` | HashRouter für Tauri |
| `src-tauri/tauri.conf.json` | App-Konfiguration, CSP, Signing, Updater |
| `src-tauri/capabilities/default.json` | Berechtigungen (HTTP zu teacherorg.com) |
| `src-tauri/Cargo.toml` | Rust-Dependencies inkl. Updater |
| `.github/workflows/release-desktop.yml` | CI/CD für automatische Builds |
| `src/utils/updater.js` | (Optional) Update-UI im Frontend |

---

## Geschätzte Kosten

| Posten | Kosten |
|--------|--------|
| Apple Developer Program | $99/Jahr |
| Windows Code Signing (Standard) | ~$100-200/Jahr |
| Windows Code Signing (EV) | ~$300-500/Jahr |

---

## Verifizierung

Nach der Implementierung testen:

- [ ] `npm run tauri:dev` startet korrekt
- [ ] Login mit teacherorg.com funktioniert
- [ ] Alle Routen laden korrekt (HashRouter)
- [ ] `npm run tauri:build` erstellt Installer
- [ ] App startet aus gebautem Bundle
- [ ] macOS: DMG installiert korrekt
- [ ] Windows: Installer läuft ohne SmartScreen-Warnung (nach Signing)
- [ ] Auto-Update funktioniert (nach Phase 7)

---

## Umsetzungsschritte

### Grundsetup
1. Rust und Tauri CLI installieren
2. Tauri im Projekt initialisieren
3. Konfigurationsdateien anpassen
4. App-Icon erstellen (1024x1024 PNG)
5. Development-Build testen

### Signing & Distribution
6. Apple Developer Account einrichten ($99/Jahr)
7. Code-Signing Zertifikate erstellen
8. GitHub Actions Workflow einrichten
9. GitHub Secrets konfigurieren
10. Erster Release-Test mit Git-Tag

### Auto-Updates (optional, später)
11. Update-Signing Keys generieren
12. Update-Endpoint auf teacherorg.com einrichten
13. Updater in tauri.conf.json aktivieren
14. Update-UI im Frontend (optional)

---

## Tauri vs Electron - Warum Tauri?

| Aspekt | Tauri | Electron |
|--------|-------|----------|
| Bundle-Größe | ~15-20 MB | ~150-200 MB |
| RAM-Verbrauch | Niedrig | Hoch (Chromium) |
| Mac-Integration | Native WebKit | Chromium |
| Technologie | Rust (Backend) | Node.js |
| Empfehlung | Für TeacherOrg ideal | Etablierter, aber schwerer |

---

*Plan erstellt: Januar 2026*
