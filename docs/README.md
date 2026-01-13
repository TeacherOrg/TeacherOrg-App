# TeacherOrg - Dokumentation

**Version:** 1.2.0 (Pocket)
**Stand:** Januar 2026
**Compliance:** nDSG (Schweizer Datenschutzgesetz)

---

## 📚 Dokumentationsübersicht

Alle wichtigen Anleitungen und Berichte für die sichere und rechtskonforme Nutzung von TeacherOrg.

---

### 🔐 Sicherheit & Compliance

#### [SICHERHEIT_COMPLIANCE_BERICHT.md](SICHERHEIT_COMPLIANCE_BERICHT.md)
**Was ist das:** Vollständiger Bericht über alle implementierten Sicherheitsmaßnahmen

**Wichtig für:**
- ✅ Übersicht: Was wurde erledigt?
- ✅ Checklisten: Was muss ich noch tun?
- ✅ Compliance-Status: Wie nDSG-konform ist die App?

**Inhalt:**
- Erledigte Maßnahmen (Code-Änderungen)
- Manuelle Konfiguration (PocketBase, Datenschutzerklärung)
- Compliance-Status nach nDSG
- ToDo-Listen für Deployment

**Zielgruppe:** Alle Nutzer

---

#### [AUDIT_LOGGING_SETUP.md](AUDIT_LOGGING_SETUP.md)
**Was ist das:** Schritt-für-Schritt Anleitung zur Einrichtung des Audit-Logging Systems

**Wichtig für:**
- ✅ PocketBase `audit_logs` Collection erstellen
- ✅ API Rules konfigurieren (Logs unveränderlich machen)
- ✅ Verifizieren dass Logging funktioniert

**Inhalt:**
- Detaillierte Anleitung für PocketBase Admin
- Feld-Definitionen für `audit_logs` Collection
- API Rules für Compliance (Logs dürfen nicht bearbeitet/gelöscht werden)
- Was wird geloggt? (Login, Datenzugriff, Änderungen)
- Compliance-Checkliste

**Geschätzter Zeitaufwand:** 15-20 Minuten

**Zielgruppe:** Alle Nutzer (PFLICHT vor Produktiv-Einsatz)

---

#### [DPA_EXOSCALE_EMAIL_TEMPLATE.md](DPA_EXOSCALE_EMAIL_TEMPLATE.md)
**Was ist das:** Fertige E-Mail-Vorlagen für DPA-Anfrage an Exoscale

**Wichtig für:**
- ✅ Data Processing Agreement (DPA) mit Hosting-Provider abschließen
- ✅ nDSG-Konformität (Auftragsverarbeitung, Art. 28)
- ✅ Rechtliche Absicherung

**Inhalt:**
- E-Mail-Vorlagen (Deutsch & Englisch)
- Hintergrundinformationen zu DPA
- Was muss ein DPA enthalten?
- Checkliste für DPA-Prüfung
- Alternative Optionen bei fehlendem DPA
- Support-Kontakte

**Geschätzter Zeitaufwand:** 30 Minuten (Vorbereitung) + 3-7 Tage Wartezeit

**Zielgruppe:** Alle Nutzer (PFLICHT vor Produktiv-Einsatz)

---

### 🚀 Deployment & Hosting

#### [EXOSCALE_DEPLOYMENT_GUIDE.md](EXOSCALE_DEPLOYMENT_GUIDE.md)
**Was ist das:** Vollständige Anleitung für produktives Deployment auf Exoscale

**Wichtig für:**
- ✅ PocketBase auf Schweizer Server deployen
- ✅ SSL-Zertifikate einrichten
- ✅ Automatische Backups konfigurieren
- ✅ Monitoring & Alerts aktivieren

**Inhalt:**
- Warum Exoscale? (nDSG-konform, Schweiz)
- Schritt-für-Schritt VM-Setup
- PocketBase Installation & systemd Service
- Domain & SSL einrichten (Caddy/Nginx)
- Datenmigration von lokal zu Server
- Automatische Backups (Exoscale Object Storage)
- Frontend-Deployment (Netlify/Vercel/VM)
- Monitoring (UptimeRobot/BetterStack)
- Sicherheits-Härtung
- Wartung & Updates
- Troubleshooting
- Skalierung bei mehr Nutzern

**Geschätzter Zeitaufwand:** 2-3 Stunden (initial)

**Kosten:** ~€8/Monat (~€97/Jahr)

**Zielgruppe:** Nutzer die produktiv deployen wollen (5+ Nutzer)

---

## 🗂️ Dokumenten-Workflow

### Phase 1: Entwicklung (lokal)
1. ✅ Code-Änderungen abgeschlossen (siehe Bericht)
2. ⏳ PocketBase lokal testen
3. ⏳ Production Build testen (`npm run build`)

**Relevante Dokumente:**
- [SICHERHEIT_COMPLIANCE_BERICHT.md](SICHERHEIT_COMPLIANCE_BERICHT.md)

---

### Phase 2: Compliance-Vorbereitung
1. ⏳ Audit-Logs Collection in PocketBase erstellen
2. ⏳ Datenschutzerklärung anpassen (Platzhalter ersetzen)
3. ⏳ DPA-Anfrage an Exoscale senden

**Relevante Dokumente:**
- [AUDIT_LOGGING_SETUP.md](AUDIT_LOGGING_SETUP.md)
- [SICHERHEIT_COMPLIANCE_BERICHT.md](SICHERHEIT_COMPLIANCE_BERICHT.md) (Abschnitt "Datenschutzerklärung")
- [DPA_EXOSCALE_EMAIL_TEMPLATE.md](DPA_EXOSCALE_EMAIL_TEMPLATE.md)

**Geschätzter Zeitaufwand:** 1 Stunde + Wartezeit für DPA

---

### Phase 3: Produktiv-Deployment
1. ⏳ Exoscale VM erstellen
2. ⏳ PocketBase deployen
3. ⏳ Domain & SSL einrichten
4. ⏳ Daten migrieren
5. ⏳ Backups automatisieren
6. ⏳ Monitoring aktivieren

**Relevante Dokumente:**
- [EXOSCALE_DEPLOYMENT_GUIDE.md](EXOSCALE_DEPLOYMENT_GUIDE.md)

**Geschätzter Zeitaufwand:** 2-3 Stunden

---

### Phase 4: Post-Deployment
1. ⏳ Funktionalität testen
2. ⏳ Sicherheit verifizieren
3. ⏳ Backups testen
4. ⏳ Erste Nutzer einladen

**Relevante Dokumente:**
- [EXOSCALE_DEPLOYMENT_GUIDE.md](EXOSCALE_DEPLOYMENT_GUIDE.md) (Checkliste)

---

## ❓ FAQ

### Welches Dokument sollte ich zuerst lesen?
➡️ **[SICHERHEIT_COMPLIANCE_BERICHT.md](SICHERHEIT_COMPLIANCE_BERICHT.md)**

Gibt Ihnen eine Übersicht über alle Maßnahmen und offene Aufgaben.

### Ich will die App lokal testen. Was muss ich tun?
➡️ **[AUDIT_LOGGING_SETUP.md](AUDIT_LOGGING_SETUP.md)**

Erstellen Sie die `audit_logs` Collection in PocketBase (dauert 15 Minuten).

### Ich will produktiv gehen. Wo fange ich an?
➡️ **In dieser Reihenfolge:**
1. [AUDIT_LOGGING_SETUP.md](AUDIT_LOGGING_SETUP.md) - PocketBase konfigurieren
2. [DPA_EXOSCALE_EMAIL_TEMPLATE.md](DPA_EXOSCALE_EMAIL_TEMPLATE.md) - DPA anfordern
3. [EXOSCALE_DEPLOYMENT_GUIDE.md](EXOSCALE_DEPLOYMENT_GUIDE.md) - Deployen

### Wie viel kostet das produktive Hosting?
➡️ **~€8/Monat** (~€97/Jahr)

Details siehe [EXOSCALE_DEPLOYMENT_GUIDE.md](EXOSCALE_DEPLOYMENT_GUIDE.md#-kostenübersicht)

### Ist die App DSGVO/nDSG-konform?
➡️ **Ja, zu 85%** (nach manuellen Konfigurationen: 100%)

Details siehe [SICHERHEIT_COMPLIANCE_BERICHT.md](SICHERHEIT_COMPLIANCE_BERICHT.md#-compliance-status)

**Noch offen:**
- Audit-Logs Collection erstellen (15 Min)
- Datenschutzerklärung anpassen (5 Min)
- DPA mit Exoscale (1h + Wartezeit)

### Brauche ich einen DPA mit Exoscale?
➡️ **Ja, für nDSG-Konformität**

Siehe [DPA_EXOSCALE_EMAIL_TEMPLATE.md](DPA_EXOSCALE_EMAIL_TEMPLATE.md) für Details und E-Mail-Vorlagen.

### Kann ich auch andere Hosting-Provider nutzen?
➡️ **Ja, aber:**

- **MUSS in der Schweiz sein** (nDSG-Anforderung)
- **Empfohlene Alternativen:** Infomaniak, Cyon, Green.ch
- **Nicht empfohlen:** AWS, Google Cloud, Azure (nicht Schweiz)

Siehe [EXOSCALE_DEPLOYMENT_GUIDE.md](EXOSCALE_DEPLOYMENT_GUIDE.md) für Vergleich.

---

## 🔗 Schnelllinks

| Was brauche ich? | Dokument |
|------------------|----------|
| **Übersicht:** Was wurde gemacht, was ist offen? | [SICHERHEIT_COMPLIANCE_BERICHT.md](SICHERHEIT_COMPLIANCE_BERICHT.md) |
| **Anleitung:** PocketBase Audit-Logs einrichten | [AUDIT_LOGGING_SETUP.md](AUDIT_LOGGING_SETUP.md) |
| **Vorlage:** DPA mit Exoscale anfragen | [DPA_EXOSCALE_EMAIL_TEMPLATE.md](DPA_EXOSCALE_EMAIL_TEMPLATE.md) |
| **Anleitung:** Produktiv deployen auf Exoscale | [EXOSCALE_DEPLOYMENT_GUIDE.md](EXOSCALE_DEPLOYMENT_GUIDE.md) |

---

## 📞 Support & Hilfe

### Technische Fragen
- **GitHub Issues:** (falls vorhanden)
- **E-Mail:** (Ihre Kontakt-E-Mail)

### Datenschutz-Fragen
- **EDÖB (Schweiz):** https://www.edoeb.admin.ch/
- **nDSG Informationen:** https://www.edoeb.admin.ch/edoeb/de/home/datenschutz/grundlagen/totalrevision-des-datenschutzgesetzes.html

### Hosting-Support
- **Exoscale:** support@exoscale.com
- **Exoscale Docs:** https://community.exoscale.com/documentation/

### PocketBase-Community
- **Dokumentation:** https://pocketbase.io/docs/
- **GitHub Discussions:** https://github.com/pocketbase/pocketbase/discussions

---

## 📝 Changelog

### v1.2.0 (Januar 2026)
- ✅ Sicherheits-Compliance Sofortmaßnahmen implementiert
- ✅ Audit-Logging System erstellt
- ✅ Datenschutzerklärung (nDSG-konform) erstellt
- ✅ DPA-Anfrage Templates erstellt
- ✅ Exoscale Deployment Guide erstellt
- ✅ Dokumentation strukturiert

---

**Letzte Aktualisierung:** 10. Januar 2026
**Erstellt von:** Claude Code (Anthropic)
**Lizenz:** Für TeacherOrg-Projekt
