# Exoscale Deployment Guide
## TeacherOrg - Produktiv-Deployment auf Exoscale

**Zielgruppe:** Self-Hosted PocketBase auf Schweizer Infrastruktur
**Geschätzte Zeit:** 2-3 Stunden (initial), ~30 Minuten (Updates)
**Kosten:** ~€8/Monat

---

## 📋 Warum Exoscale?

| Aspekt | Details | Bewertung |
|--------|---------|-----------|
| **Schweizer Unternehmen** | Sitz in Lausanne | ⭐⭐⭐⭐⭐ |
| **Datacenter in CH** | CH-DK-2 (Zürich), CH-GVA-2 (Genf) | ⭐⭐⭐⭐⭐ |
| **nDSG-konform** | 100% (Daten bleiben in CH) | ⭐⭐⭐⭐⭐ |
| **GDPR-konform** | Ja (zertifiziert) | ⭐⭐⭐⭐⭐ |
| **ISO 27001** | Ja | ⭐⭐⭐⭐⭐ |
| **DPA verfügbar** | Wahrscheinlich (anfragen) | ⭐⭐⭐⭐⭐ |
| **Preis** | €5-30/Monat | ⭐⭐⭐⭐ |
| **Performance** | Sehr gut | ⭐⭐⭐⭐⭐ |
| **Support** | Gut (EN/FR) | ⭐⭐⭐⭐ |

**Fazit:** ✅ Perfekt für nDSG-konforme Schweizer Apps

---

## 🎯 Deployment-Übersicht

### Architektur

```
┌─────────────────────────────────────────────────────────┐
│                    Internet (HTTPS)                      │
└────────────┬─────────────────────────────┬──────────────┘
             │                             │
             │                             │
     ┌───────▼──────┐              ┌──────▼──────────┐
     │   Frontend   │              │   PocketBase    │
     │   (Netlify   │              │   (Exoscale VM) │
     │  /Vercel)    │◄─────────────┤   Port 8090     │
     │   Gratis     │   API Calls  │   CH-DK-2       │
     └──────────────┘              └─────────────────┘
                                            │
                                            │ Backups
                                   ┌────────▼─────────┐
                                   │  Object Storage  │
                                   │   (S3-compat)    │
                                   │   CH-DK-2        │
                                   └──────────────────┘
```

### Komponenten

1. **Exoscale Compute Instance (VM)**
   - Ubuntu 22.04 LTS
   - Micro Instance (~€5/Monat)
   - PocketBase als systemd Service

2. **Exoscale Object Storage**
   - Automatische tägliche Backups
   - S3-kompatibel
   - ~€2/Monat für 10GB

3. **Frontend Hosting**
   - Option A: Netlify (gratis, empfohlen)
   - Option B: Vercel (gratis)
   - Option C: Gleiche VM wie Backend

4. **Domain & SSL**
   - Domain: teacherorg.ch (~CHF 15/Jahr)
   - SSL: Let's Encrypt (gratis, automatisch)

---

## 💰 Kostenübersicht

| Service | Kosten/Monat | Kosten/Jahr |
|---------|--------------|-------------|
| Exoscale Micro Instance | €4.87 | €58.44 |
| Exoscale Object Storage (10GB) | ~€2.00 | €24.00 |
| Domain (.ch) | ~€1.25 | €15.00 |
| SSL-Zertifikat (Let's Encrypt) | Gratis ✅ | Gratis ✅ |
| UptimeRobot Monitoring | Gratis ✅ | Gratis ✅ |
| Netlify Frontend Hosting | Gratis ✅ | Gratis ✅ |
| **GESAMT** | **~€8/Monat** | **~€97/Jahr** |

**Skalierung (bei Bedarf):**
- Small Instance (50-200 Nutzer): €15/Monat
- Medium Instance (200-1000 Nutzer): €30/Monat

---

## 🚀 Schritt-für-Schritt Deployment

### Vorbereitung (lokal)

#### 1. Production Build testen

```bash
# Im Projekt-Verzeichnis
cd c:\Users\Gaming-PC\Teacherorg_Alpha1.2_Pocket

# Production Build erstellen
npm run build

# Prüfen: Sind Dateien minified?
ls -lh dist/assets/*.js
# Sollten klein sein (z.B. 150KB statt 2MB)
# Sollten unleserlich sein (minified)

# Build lokal testen
npm run preview
# Öffnen: http://localhost:4173
```

#### 2. Environment-Variablen für Produktion

```bash
# Neue Datei: .env.production
echo "VITE_POCKETBASE_URL=https://api.teacherorg.ch" > .env.production
echo "VITE_APP_NAME=TeacherOrg" >> .env.production

# WICHTIG: .env.production NICHT committen!
# Prüfen in .gitignore:
cat .gitignore | grep ".env"
# Sollte .env* enthalten
```

---

### Phase 1: Exoscale VM einrichten

#### Schritt 1: Account & Billing

1. **Exoscale-Account erstellen** (falls noch nicht vorhanden)
   - https://portal.exoscale.com/register
   - E-Mail-Adresse verifizieren
   - Zahlungsmethode hinzufügen (Kreditkarte oder SEPA)

2. **Compute Zone wählen**
   - Empfohlen: **CH-DK-2** (Zürich)
   - Alternative: CH-GVA-2 (Genf)

#### Schritt 2: VM erstellen

**Via Web-Interface:**

1. Öffnen: https://portal.exoscale.com/compute/instances
2. Klicken: **"Add"** → **"Compute Instance"**
3. **Konfiguration:**
   - **Name:** `teacherorg-prod`
   - **Zone:** CH-DK-2 (Zürich)
   - **Template:** Linux Ubuntu 22.04 LTS 64-bit
   - **Instance Type:** Micro (€4.87/Monat)
   - **Disk Size:** 10 GB SSD
   - **SSH Key:** Neuen SSH-Key hinzufügen oder bestehenden wählen

4. **SSH Key generieren** (falls noch nicht vorhanden):
   ```bash
   # Windows (PowerShell):
   ssh-keygen -t ed25519 -C "your.email@example.com"
   # Speichern: C:\Users\[USERNAME]\.ssh\id_ed25519

   # Public Key anzeigen:
   cat C:\Users\[USERNAME]\.ssh\id_ed25519.pub
   # Kopieren und in Exoscale einfügen
   ```

5. **Security Group konfigurieren:**
   - **SSH (22):** Nur Ihre IP (für Sicherheit)
   - **HTTP (80):** Anywhere (0.0.0.0/0)
   - **HTTPS (443):** Anywhere (0.0.0.0/0)
   - **Custom (8090):** Anywhere (für PocketBase Admin)

6. **Create** klicken

**Warten:** ~2-3 Minuten bis VM läuft

---

#### Schritt 3: Erste Verbindung & System-Update

```bash
# SSH-Verbindung (IP aus Exoscale Portal kopieren)
ssh ubuntu@[IHRE-EXOSCALE-IP]

# Beispiel:
# ssh ubuntu@185.19.28.123

# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Firewall einrichten (zusätzlich zu Security Groups)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 8090/tcp # PocketBase
sudo ufw enable

# Timezone setzen (Schweiz)
sudo timedatectl set-timezone Europe/Zurich

# Fertig - System bereit für PocketBase
```

---

### Phase 2: PocketBase installieren

#### Schritt 1: PocketBase herunterladen

```bash
# In Home-Verzeichnis
cd ~

# Neueste Version herunterladen (Stand Januar 2026: v0.26.2)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.26.2/pocketbase_0.26.2_linux_amd64.zip

# Entpacken
unzip pocketbase_0.26.2_linux_amd64.zip

# Nach /usr/local/bin verschieben
sudo mv pocketbase /usr/local/bin/
sudo chmod +x /usr/local/bin/pocketbase

# Prüfen
pocketbase --version
# Sollte zeigen: pocketbase version 0.26.2
```

#### Schritt 2: PocketBase-Verzeichnis erstellen

```bash
# Verzeichnis für PocketBase-Daten
sudo mkdir -p /var/lib/pocketbase
sudo chown ubuntu:ubuntu /var/lib/pocketbase

# Wechseln ins Verzeichnis
cd /var/lib/pocketbase

# Test-Start (kurz laufen lassen, dann Ctrl+C)
pocketbase serve --http="0.0.0.0:8090"
# Sollte starten ohne Fehler
# Ctrl+C zum Beenden
```

#### Schritt 3: Admin-Account erstellen

```bash
# PocketBase im Hintergrund starten (temporär)
pocketbase serve --http="0.0.0.0:8090" &

# Im Browser öffnen:
# http://[IHRE-EXOSCALE-IP]:8090/_/

# Admin-Account erstellen:
# - E-Mail: admin@teacherorg.ch (oder Ihre E-Mail)
# - Passwort: [SICHERES PASSWORT]

# PocketBase wieder stoppen
pkill pocketbase
```

#### Schritt 4: Als systemd Service einrichten

```bash
# Service-Datei erstellen
sudo nano /etc/systemd/system/pocketbase.service
```

**Datei-Inhalt:**
```ini
[Unit]
Description=PocketBase Backend Service
After=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/var/lib/pocketbase
ExecStart=/usr/local/bin/pocketbase serve --http="0.0.0.0:8090"
Restart=always
RestartSec=5
StandardOutput=append:/var/log/pocketbase.log
StandardError=append:/var/log/pocketbase-error.log

# Security Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/pocketbase

[Install]
WantedBy=multi-user.target
```

**Speichern:** Ctrl+X, dann Y, dann Enter

```bash
# Log-Dateien erstellen
sudo touch /var/log/pocketbase.log
sudo touch /var/log/pocketbase-error.log
sudo chown ubuntu:ubuntu /var/log/pocketbase*.log

# Service aktivieren und starten
sudo systemctl daemon-reload
sudo systemctl enable pocketbase
sudo systemctl start pocketbase

# Status prüfen
sudo systemctl status pocketbase
# Sollte "active (running)" zeigen

# Logs anschauen
sudo journalctl -u pocketbase -f
# Sollte keine Fehler zeigen
# Ctrl+C zum Beenden
```

**Verifikation:**
- Im Browser: `http://[EXOSCALE-IP]:8090/_/`
- Sollte PocketBase Admin-Panel zeigen

---

### Phase 3: Domain & SSL einrichten

#### Option A: Caddy (empfohlen - automatisches SSL)

**Vorteile:**
- ✅ Automatisches SSL-Zertifikat
- ✅ Automatische Renewal
- ✅ Einfache Konfiguration
- ✅ Modernes HTTP/2 & HTTP/3

```bash
# Caddy installieren
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

sudo apt update
sudo apt install caddy

# Caddyfile erstellen
sudo nano /etc/caddy/Caddyfile
```

**Caddyfile Inhalt:**
```
# PocketBase API
api.teacherorg.ch {
    reverse_proxy localhost:8090

    # Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
    }
}

# Optional: Frontend auf gleicher Domain
teacherorg.ch {
    root * /var/www/teacherorg
    file_server
    try_files {path} /index.html

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
    }
}
```

**Speichern:** Ctrl+X, Y, Enter

```bash
# Caddy-Konfiguration testen
sudo caddy validate --config /etc/caddy/Caddyfile

# Caddy starten
sudo systemctl enable caddy
sudo systemctl restart caddy

# Status prüfen
sudo systemctl status caddy

# Logs anschauen
sudo journalctl -u caddy -f
```

**WICHTIG: Domain-DNS konfigurieren**

Bevor SSL funktioniert, DNS-Einträge erstellen:

```
A-Record:
api.teacherorg.ch → [IHRE-EXOSCALE-IP]

A-Record:
teacherorg.ch → [IHRE-EXOSCALE-IP]

# Beispiel:
api.teacherorg.ch → 185.19.28.123
teacherorg.ch → 185.19.28.123
```

**Warten:** 5-15 Minuten für DNS-Propagierung

**Testen:**
```bash
# SSL-Zertifikat wird automatisch erstellt
# Caddy holt sich Let's Encrypt Zertifikat

# Im Browser öffnen:
# https://api.teacherorg.ch/_/
# Sollte PocketBase mit gültigem SSL-Zertifikat zeigen
```

---

#### Option B: Nginx + Certbot (manuelle Methode)

<details>
<summary>Klicken zum Aufklappen (nur wenn Sie kein Caddy wollen)</summary>

```bash
# Nginx + Certbot installieren
sudo apt install -y nginx certbot python3-certbot-nginx

# Nginx-Config erstellen
sudo nano /etc/nginx/sites-available/teacherorg
```

**Config-Inhalt:**
```nginx
server {
    listen 80;
    server_name api.teacherorg.ch;

    location / {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Aktivieren
sudo ln -s /etc/nginx/sites-available/teacherorg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL-Zertifikat mit Certbot
sudo certbot --nginx -d api.teacherorg.ch

# Folgen Sie den Anweisungen:
# - E-Mail eingeben
# - Terms akzeptieren
# - Redirect zu HTTPS: Ja

# Auto-Renewal testen
sudo certbot renew --dry-run
```

</details>

---

### Phase 4: Daten migrieren

#### Schritt 1: Lokale Daten exportieren

```bash
# Auf lokalem PC (Windows PowerShell)
cd C:\Users\Gaming-PC\Teacherorg_Alpha1.2_Pocket

# PocketBase-Datenbank exportieren
# (Annahme: PocketBase läuft lokal in pb_data/)

# Backup erstellen
.\pocketbase backup backup_migration.zip

# Backup auf Server hochladen
scp backup_migration.zip ubuntu@[EXOSCALE-IP]:/var/lib/pocketbase/
```

#### Schritt 2: Auf Server importieren

```bash
# Auf Server (SSH)
ssh ubuntu@[EXOSCALE-IP]

cd /var/lib/pocketbase

# PocketBase stoppen
sudo systemctl stop pocketbase

# Backup restore
pocketbase restore backup_migration.zip

# PocketBase starten
sudo systemctl start pocketbase

# Verifizieren
sudo systemctl status pocketbase

# Im Browser prüfen:
# https://api.teacherorg.ch/_/
# Einloggen mit Admin-Credentials
# Prüfen ob Collections und Daten vorhanden
```

---

### Phase 5: Backups automatisieren

#### Schritt 1: Exoscale Object Storage einrichten

**Via Web-Interface:**
1. https://portal.exoscale.com/storage
2. **Create Bucket**
   - Name: `teacherorg-backups`
   - Zone: CH-DK-2 (gleiche wie VM)
3. **Access Key erstellen**
   - Speichern: Access Key & Secret Key

#### Schritt 2: s3cmd installieren & konfigurieren

```bash
# Auf Server
sudo apt install -y s3cmd

# Konfigurieren
s3cmd --configure

# Eingaben:
# Access Key: [VON EXOSCALE]
# Secret Key: [VON EXOSCALE]
# Default Region: ch-dk-2
# S3 Endpoint: sos-ch-dk-2.exo.io
# DNS-style bucket: %(bucket)s.sos-ch-dk-2.exo.io
# Encryption password: [LEER LASSEN - Enter]
# Path to GPG: [LEER LASSEN - Enter]
# Use HTTPS: Yes
# Test access: Yes (sollte erfolgreich sein)
# Save settings: Yes

# Testen
s3cmd ls s3://teacherorg-backups/
# Sollte leeren Bucket zeigen
```

#### Schritt 3: Backup-Script erstellen

```bash
# Script erstellen
nano ~/backup-pocketbase.sh
```

**Script-Inhalt:**
```bash
#!/bin/bash

# TeacherOrg PocketBase Backup Script
# Erstellt tägliche Backups und lädt sie auf Exoscale Object Storage hoch

BACKUP_DIR="/var/lib/pocketbase/pb_data/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.zip"
S3_BUCKET="s3://teacherorg-backups"

# Log-Funktion
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/pocketbase-backup.log
}

log "===== Backup gestartet ====="

# Wechsel ins PocketBase-Verzeichnis
cd /var/lib/pocketbase || exit 1

# PocketBase Backup erstellen
log "Erstelle PocketBase Backup: ${BACKUP_FILE}"
pocketbase backup "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    log "✅ Backup erfolgreich erstellt"
else
    log "❌ Backup-Erstellung fehlgeschlagen"
    exit 1
fi

# Auf Exoscale Object Storage hochladen
log "Lade Backup auf Object Storage hoch..."
s3cmd put "${BACKUP_FILE}" "${S3_BUCKET}/"

if [ $? -eq 0 ]; then
    log "✅ Upload erfolgreich"
else
    log "❌ Upload fehlgeschlagen"
    exit 1
fi

# Alte lokale Backups löschen (älter als 7 Tage)
log "Lösche alte lokale Backups (>7 Tage)..."
find "${BACKUP_DIR}" -name "backup_*.zip" -mtime +7 -delete

# Alte S3 Backups löschen (älter als 30 Tage)
log "Lösche alte S3 Backups (>30 Tage)..."
s3cmd ls "${S3_BUCKET}/" | while read -r line; do
    createDate=$(echo "$line" | awk {'print $1" "$2'})
    createDate=$(date -d "$createDate" +%s)
    olderThan=$(date -d "30 days ago" +%s)

    if [[ $createDate -lt $olderThan ]]; then
        fileName=$(echo "$line" | awk {'print $4'})
        if [[ $fileName != "" ]]; then
            log "Lösche altes Backup: ${fileName}"
            s3cmd del "${fileName}"
        fi
    fi
done

log "===== Backup abgeschlossen ====="
```

**Speichern & Ausführbar machen:**
```bash
chmod +x ~/backup-pocketbase.sh

# Test-Run
./backup-pocketbase.sh

# Prüfen ob erfolgreich
s3cmd ls s3://teacherorg-backups/
# Sollte neues Backup zeigen
```

#### Schritt 4: Cron-Job einrichten

```bash
# Crontab bearbeiten
crontab -e

# Wählen Sie nano (Option 1)

# Folgende Zeile hinzufügen (täglich um 3 Uhr nachts):
0 3 * * * /home/ubuntu/backup-pocketbase.sh

# Speichern: Ctrl+X, Y, Enter

# Verifizieren
crontab -l
# Sollte die Cron-Zeile zeigen
```

---

### Phase 6: Frontend deployen

#### Option A: Netlify (empfohlen, gratis)

**Vorteile:**
- ✅ Gratis für unbegrenzte Bandbreite
- ✅ Globales CDN (schnell)
- ✅ Automatische Deployments via Git
- ✅ Eigene Domain einfach verknüpfbar

```bash
# Auf lokalem PC
npm install -g netlify-cli

# Login
netlify login
# Öffnet Browser für Authentifizierung

# Build erstellen
npm run build

# Deployen
netlify deploy --prod

# Folgen Sie den Anweisungen:
# - Create & configure new site: Yes
# - Team: [Ihr Team wählen]
# - Site name: teacherorg (oder Wunschname)
# - Publish directory: dist

# Umgebungsvariablen setzen (im Netlify Dashboard):
# https://app.netlify.com/sites/[SITE-NAME]/settings/deploys
# - VITE_POCKETBASE_URL = https://api.teacherorg.ch

# Custom Domain verknüpfen (optional):
# https://app.netlify.com/sites/[SITE-NAME]/settings/domain
# - Add custom domain: teacherorg.ch
# - DNS konfigurieren wie angezeigt
```

---

#### Option B: Vercel (Alternative zu Netlify)

```bash
# Vercel CLI installieren
npm install -g vercel

# Login
vercel login

# Deployen
vercel --prod

# Umgebungsvariablen:
# https://vercel.com/[USERNAME]/teacherorg/settings/environment-variables
# - VITE_POCKETBASE_URL = https://api.teacherorg.ch
```

---

#### Option C: Auf gleicher VM wie Backend

```bash
# Auf lokalem PC - Build erstellen
npm run build

# Auf Server hochladen
scp -r dist/* ubuntu@[EXOSCALE-IP]:/tmp/teacherorg-frontend/

# Auf Server
ssh ubuntu@[EXOSCALE-IP]

# Frontend-Verzeichnis erstellen
sudo mkdir -p /var/www/teacherorg
sudo cp -r /tmp/teacherorg-frontend/* /var/www/teacherorg/
sudo chown -R www-data:www-data /var/www/teacherorg

# Caddy ist bereits konfiguriert (siehe oben)
# Fertig - erreichbar unter https://teacherorg.ch
```

---

### Phase 7: Monitoring & Alerts

#### UptimeRobot (gratis, empfohlen)

1. **Account erstellen:** https://uptimerobot.com
2. **Monitor hinzufügen:**
   - Monitor Type: HTTPS
   - Friendly Name: TeacherOrg API
   - URL: https://api.teacherorg.ch
   - Monitoring Interval: 5 Minuten

3. **Alert Contacts:**
   - E-Mail: Ihre E-Mail-Adresse
   - Optional: SMS oder Slack

4. **Fertig:** Sie werden benachrichtigt wenn Server down ist

---

#### BetterStack (Alternative, erweiterte Features)

1. **Account:** https://betterstack.com
2. **Heartbeat Monitor:**
   - URL: https://api.teacherorg.ch
   - Interval: 1 Minute
   - Alerts: E-Mail, SMS, Slack

**Gratis bis 10 Monitore**

---

### Phase 8: Sicherheits-Härtung

#### SSL/TLS-Konfiguration prüfen

```bash
# SSL Labs Test (lokal im Browser):
# https://www.ssllabs.com/ssltest/analyze.html?d=api.teacherorg.ch
# Ziel: A oder A+ Rating
```

#### Security Headers prüfen

```bash
# In Browser-Konsole (DevTools → Network):
# Prüfen Sie Response Headers:
# - Strict-Transport-Security: max-age=31536000
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
```

#### Fail2Ban einrichten (SSH-Schutz)

```bash
# Auf Server
sudo apt install -y fail2ban

# Konfigurieren
sudo nano /etc/fail2ban/jail.local
```

**Jail-Config:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log
```

```bash
# Fail2Ban starten
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# Status prüfen
sudo fail2ban-client status sshd
```

---

## ✅ Post-Deployment Checkliste

### Funktionalität

- [ ] PocketBase Admin erreichbar: `https://api.teacherorg.ch/_/`
- [ ] Login mit Admin-Account funktioniert
- [ ] Collections sichtbar (users, students, performance, etc.)
- [ ] Frontend erreichbar: `https://teacherorg.ch`
- [ ] Frontend → Backend API-Calls funktionieren
- [ ] Login im Frontend funktioniert
- [ ] Daten werden korrekt angezeigt

### Sicherheit

- [ ] SSL-Zertifikat gültig (kein Browser-Warnung)
- [ ] SSL Labs Rating: A oder besser
- [ ] Security Headers aktiv (DevTools prüfen)
- [ ] Firewall aktiv: `sudo ufw status`
- [ ] Fail2Ban aktiv: `sudo systemctl status fail2ban`
- [ ] SSH nur mit Key-Auth (kein Passwort)

### Backups

- [ ] Manuelles Backup funktioniert: `./backup-pocketbase.sh`
- [ ] Backup auf S3 sichtbar: `s3cmd ls s3://teacherorg-backups/`
- [ ] Cron-Job aktiv: `crontab -l`
- [ ] Backup-Restore getestet (optional aber empfohlen)

### Monitoring

- [ ] UptimeRobot Monitor aktiv
- [ ] Test-Alert erhalten (Monitor kurz pausieren)
- [ ] systemd Service auto-restart bei Crash:
  ```bash
  # PocketBase killen und prüfen ob neustartet
  sudo killall pocketbase
  sleep 10
  sudo systemctl status pocketbase
  # Sollte wieder "active (running)" sein
  ```

### Performance

- [ ] Frontend lädt schnell (<2 Sekunden)
- [ ] API-Calls schnell (<500ms)
- [ ] Keine Console-Errors im Browser

### Compliance

- [ ] PocketBase `audit_logs` Collection erstellt
- [ ] Audit-Logging funktioniert (Login → Log prüfen)
- [ ] Datenschutzerklärung erreichbar: `/privacy`
- [ ] DPA mit Exoscale unterzeichnet

---

## 🔧 Wartung & Updates

### PocketBase updaten

```bash
# Auf Server
ssh ubuntu@[EXOSCALE-IP]

# Backup erstellen VOR Update
cd /var/lib/pocketbase
pocketbase backup backup_before_update.zip

# PocketBase stoppen
sudo systemctl stop pocketbase

# Neue Version herunterladen
cd ~
wget https://github.com/pocketbase/pocketbase/releases/download/v0.27.0/pocketbase_0.27.0_linux_amd64.zip
unzip pocketbase_0.27.0_linux_amd64.zip

# Alte Version ersetzen
sudo mv pocketbase /usr/local/bin/
sudo chmod +x /usr/local/bin/pocketbase

# PocketBase starten
sudo systemctl start pocketbase

# Status prüfen
sudo systemctl status pocketbase

# Funktionalität testen
# https://api.teacherorg.ch/_/
```

### System-Updates

```bash
# Monatlich ausführen
sudo apt update && sudo apt upgrade -y

# Bei Kernel-Updates: Neustart erforderlich
sudo reboot
```

### SSL-Zertifikat Renewal

**Caddy:** Automatisch (kein Eingreifen nötig)

**Nginx/Certbot:**
```bash
# Manuell erneuern
sudo certbot renew

# Auto-Renewal prüfen
sudo systemctl status certbot.timer
```

---

## 🚨 Troubleshooting

### Problem: PocketBase startet nicht

```bash
# Logs anschauen
sudo journalctl -u pocketbase -n 50

# Häufige Ursachen:
# 1. Port 8090 bereits belegt
sudo lsof -i :8090

# 2. Permissions-Fehler
sudo chown -R ubuntu:ubuntu /var/lib/pocketbase

# 3. Korrupte Datenbank
# Restore vom letzten Backup
```

### Problem: SSL-Zertifikat funktioniert nicht

```bash
# Caddy-Logs prüfen
sudo journalctl -u caddy -n 50

# Häufige Ursachen:
# 1. DNS nicht korrekt
dig api.teacherorg.ch
# Sollte Ihre Exoscale-IP zeigen

# 2. Port 80/443 nicht erreichbar
sudo ufw status
# Sollte 80 und 443 allow zeigen

# 3. Let's Encrypt Rate Limit
# Warten 1 Stunde und erneut versuchen
```

### Problem: Backup-Script fehlschlägt

```bash
# Logs prüfen
cat /var/log/pocketbase-backup.log

# S3-Verbindung testen
s3cmd ls s3://teacherorg-backups/

# S3-Config neu erstellen
s3cmd --configure
```

### Problem: Frontend-API-Calls schlagen fehl

```bash
# Browser DevTools → Network Tab
# Prüfen auf CORS-Fehler

# PocketBase CORS erlauben (falls nötig)
# Im PocketBase Admin:
# Settings → Application → Allowed origins
# Hinzufügen: https://teacherorg.ch
```

---

## 📊 Skalierung bei mehr Nutzern

### 50-200 Nutzer: Small Instance

```bash
# In Exoscale Portal:
# 1. VM Snapshot erstellen (Backup)
# 2. Instance → Resize
# 3. Wählen: Small (€15/Monat)
# 4. Restart
```

### 200-500 Nutzer: Medium Instance + DB-Optimierung

```bash
# Medium Instance: €30/Monat

# PocketBase-Optimierung
# In /var/lib/pocketbase/pb_data/data.db:
# PRAGMA journal_mode = WAL;
# PRAGMA synchronous = NORMAL;
# PRAGMA cache_size = -64000;
```

### 500+ Nutzer: Load Balancing oder Migration

**Optionen:**
1. **Dedizierter Server** (~€50/Monat)
2. **Kubernetes (Exoscale SKS)** (~€100/Monat)
3. **Managed Database** (~€80/Monat)

**An diesem Punkt:** Professionelle DevOps-Beratung empfohlen

---

## 📞 Support & Hilfe

### Exoscale Support

- **E-Mail:** support@exoscale.com
- **Portal:** https://portal.exoscale.com/support
- **Dokumentation:** https://community.exoscale.com/documentation/

### PocketBase Community

- **Dokumentation:** https://pocketbase.io/docs/
- **GitHub Issues:** https://github.com/pocketbase/pocketbase/issues
- **Discussions:** https://github.com/pocketbase/pocketbase/discussions

### Schweizer Datenschutz

- **EDÖB (Datenschutzbehörde):** https://www.edoeb.admin.ch/
- **nDSG Informationen:** https://www.edoeb.admin.ch/edoeb/de/home/datenschutz/grundlagen/totalrevision-des-datenschutzgesetzes.html

---

## 🎉 Herzlichen Glückwunsch!

Ihre TeacherOrg-App ist jetzt produktiv auf Schweizer Infrastruktur deployed!

**Was Sie erreicht haben:**
- ✅ Sichere Schweizer Hosting-Umgebung
- ✅ Automatische SSL-Verschlüsselung
- ✅ Tägliche Backups
- ✅ Monitoring & Alerts
- ✅ nDSG-konforme Infrastruktur
- ✅ Professionelle Skalierbarkeit

**Nächste Schritte:**
1. Audit-Logs Collection in PocketBase erstellen (siehe `AUDIT_LOGGING_SETUP.md`)
2. Datenschutzerklärung anpassen (siehe `SICHERHEIT_COMPLIANCE_BERICHT.md`)
3. DPA mit Exoscale abschließen (siehe `DPA_EXOSCALE_EMAIL_TEMPLATE.md`)
4. Erste echte Nutzer einladen!

---

**Erstellt:** Januar 2026
**Version:** 1.0
**Autor:** Claude Code (Anthropic)
**Lizenz:** Für TeacherOrg-Projekt
