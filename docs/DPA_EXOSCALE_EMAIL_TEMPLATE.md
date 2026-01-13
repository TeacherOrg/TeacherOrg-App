# DPA (Data Processing Agreement) Anfrage an Exoscale

## E-Mail Template für Exoscale Support

---

**An:** support@exoscale.com
**Betreff:** Data Processing Agreement (DPA) Request for Swiss nDSG Compliance
**Sprache:** Englisch (bevorzugt) oder Deutsch

---

### E-Mail-Vorlage (Deutsch)

```
Betreff: Anfrage: Auftragsverarbeitungsvertrag (AVV/DPA) für nDSG-Konformität

Sehr geehrtes Exoscale-Team,

ich betreibe auf Ihrer Infrastruktur eine Schulverwaltungsanwendung (TeacherOrg),
die personenbezogene Daten von Schülerinnen und Schülern verarbeitet (Namen,
Leistungsdaten).

Zur Einhaltung des Schweizer Datenschutzgesetzes (nDSG) benötige ich einen
Auftragsverarbeitungsvertrag (Data Processing Agreement / DPA) mit Exoscale.

**Anfrage:**
1. Stellt Exoscale einen standardisierten DPA/AVV zur Verfügung?
2. Wenn ja, wie kann ich diesen anfordern oder herunterladen?
3. Welche Informationen benötigen Sie von mir für den Vertragsabschluss?
4. Bietet Exoscale zusätzliche Sicherheitszertifizierungen (ISO 27001, SOC 2)?

**Hintergrund:**
- Rechtsgrundlage: Schweizer Datenschutzgesetz (nDSG)
- Datenkategorie: Personenbezogene Daten (Schülernamen, Leistungsdaten)
- Betroffene Personen: Schüler und Lehrpersonen
- Zweck: Schulverwaltung (Noten, Unterrichtsplanung)
- Speicherort: Exoscale Datacenter Schweiz (CH-DK-2 oder CH-GVA-2)

**Meine Account-Details:**
- Account-Name/Organisation: [Ihre Organisation]
- Account-ID/E-Mail: [Ihre Exoscale-Account-E-Mail]
- Verwendete Services: Compute Instances, Object Storage (falls zutreffend)

Ich bitte um zeitnahe Rückmeldung, da die Anwendung bereits im Einsatz ist
und die rechtliche Absicherung dringend erforderlich ist.

Vielen Dank im Voraus für Ihre Unterstützung.

Mit freundlichen Grüßen,
[Ihr Name]
[Ihre Position]
[Ihre Organisation/Schule]
[Ihre Kontaktdaten]
```

---

### E-Mail-Vorlage (Englisch)

```
Subject: Request: Data Processing Agreement (DPA) for Swiss nDSG Compliance

Dear Exoscale Support Team,

I am operating a school administration application (TeacherOrg) on your
infrastructure that processes personal data of students (names, performance data).

To comply with the Swiss Federal Act on Data Protection (nDSG), I require
a Data Processing Agreement (DPA) with Exoscale as my data processor.

**Request:**
1. Does Exoscale provide a standardized Data Processing Agreement (DPA)?
2. If yes, how can I request or download it?
3. What information do you need from me to establish this agreement?
4. Does Exoscale offer additional security certifications (ISO 27001, SOC 2)?

**Background:**
- Legal basis: Swiss Federal Act on Data Protection (nDSG)
- Data category: Personal data (student names, performance records)
- Data subjects: Students and teachers
- Purpose: School administration (grading, lesson planning)
- Storage location: Exoscale Datacenter Switzerland (CH-DK-2 or CH-GVA-2)

**My Account Details:**
- Account Name/Organization: [Your Organization]
- Account ID/Email: [Your Exoscale Account Email]
- Services Used: Compute Instances, Object Storage (if applicable)

I kindly request a timely response, as the application is already in use
and legal compliance is urgently required.

Thank you in advance for your support.

Best regards,
[Your Name]
[Your Position]
[Your Organization/School]
[Your Contact Details]
```

---

## Wichtige Informationen zu DPA mit Exoscale

### Was ist ein DPA?

Ein **Data Processing Agreement (DPA)** oder **Auftragsverarbeitungsvertrag (AVV)** ist ein
rechtlicher Vertrag zwischen:
- **Verantwortlicher (Controller)**: Sie (die Schule/Organisation)
- **Auftragsverarbeiter (Processor)**: Exoscale (der Hosting-Provider)

### Was sollte der DPA enthalten?

Ein nDSG-konformer DPA sollte mindestens folgende Punkte regeln:

1. **Gegenstand und Dauer der Verarbeitung**
   - Art der verarbeiteten Daten
   - Zweck der Verarbeitung
   - Laufzeit des Vertrags

2. **Art und Zweck der Verarbeitung**
   - Hosting von Datenbanken
   - Speicherung von Backups
   - Bereitstellung von Rechenleistung

3. **Art der personenbezogenen Daten**
   - Schülerdaten (Namen, Leistungen)
   - Lehrpersonendaten (Namen, E-Mail)

4. **Kategorien betroffener Personen**
   - Schülerinnen und Schüler
   - Lehrpersonen

5. **Pflichten und Rechte des Verantwortlichen**
   - Weisungsrecht
   - Kontrollrecht
   - Recht auf Löschung

6. **Pflichten des Auftragsverarbeiters**
   - Vertraulichkeit
   - Sicherheitsmaßnahmen (Art. 8 nDSG)
   - Unterstützung bei Betroffenenrechten
   - Meldung von Datenschutzverletzungen

7. **Technische und organisatorische Maßnahmen (TOMs)**
   - Zugriffskontrolle
   - Verschlüsselung
   - Backup-Strategie
   - Incident Response

8. **Unterauftragsverarbeiter**
   - Liste der Sub-Processors
   - Zustimmungspflicht bei Änderungen

9. **Datenübermittlung in Drittländer**
   - In der Regel nicht relevant (Exoscale CH bleibt in der Schweiz)

10. **Löschung und Rückgabe von Daten**
    - Nach Vertragsende

### Was, wenn Exoscale keinen DPA anbietet?

Falls Exoscale keinen standardisierten DPA bereitstellt, haben Sie folgende Optionen:

**Option 1: Eigenen DPA-Entwurf vorschlagen**
- Verwenden Sie einen Standard-DPA-Template (z.B. von SwissDPA.ch)
- Passen Sie ihn an Exoscale an
- Senden Sie ihn zur Prüfung an Exoscale

**Option 2: Minimale vertragliche Vereinbarung**
- Fordern Sie schriftliche Bestätigung folgender Punkte:
  - Daten bleiben in der Schweiz (CH Datacenter)
  - Keine Weitergabe an Dritte
  - Angemessene Sicherheitsmaßnahmen (ISO 27001 etc.)
  - Löschung bei Vertragsende

**Option 3: Alternative Hosting-Provider**
- Infomaniak (Schweiz, bietet standardmäßig DPA)
- Cyon (Schweiz, spezialisiert auf Datenschutz)
- Azure Switzerland (Microsoft bietet standardisierten DPA)

### Exoscale Datenschutz-Status (Stand Januar 2025)

- ✅ **Schweizer Datacenter**: CH-DK-2 (Zürich), CH-GVA-2 (Genf)
- ✅ **ISO 27001 zertifiziert**: Ja
- ✅ **GDPR-konform**: Ja (EU-Standard, höher als nDSG)
- ✅ **Schweizer Unternehmen**: Ja (rechtlicher Sitz in Schweiz)
- ⚠️ **DPA verfügbar**: Unklar, muss angefragt werden

**Wahrscheinlichkeit:** Exoscale bietet höchstwahrscheinlich einen DPA an,
da sie GDPR-konform sind (strengere EU-Vorschriften).

---

## Nach Erhalt des DPA

### Checkliste für DPA-Prüfung

Wenn Sie den DPA von Exoscale erhalten, prüfen Sie:

- [ ] Sind alle oben genannten Punkte enthalten?
- [ ] Ist der Speicherort explizit auf "Schweiz" beschränkt?
- [ ] Sind die Sicherheitsmaßnahmen ausreichend beschrieben?
- [ ] Ist die Vertragslaufzeit geklärt?
- [ ] Sind die Rechte zur Löschung/Rückgabe der Daten geregelt?
- [ ] Sind Sub-Processors aufgelistet?
- [ ] Ist die Meldepflicht bei Datenpannen geregelt?

### DPA-Aufbewahrung

- **Original-DPA aufbewahren** (digital + physisch)
- **Zugänglich machen** für Datenschutz-Audits
- **Bei Änderungen aktualisieren**
- **Bei Vertragsende archivieren** (3 Jahre Aufbewahrungspflicht)

---

## Geschätzter Zeitaufwand

- **E-Mail vorbereiten und senden**: 15 Minuten
- **Wartezeit auf Antwort**: 3-7 Werktage
- **DPA-Prüfung**: 30 Minuten
- **Unterzeichnung**: 15 Minuten

**Gesamtaufwand:** ~1 Stunde aktive Arbeit + Wartezeit

---

## Alternative: Self-Hosting Dokumentation

Falls Sie PocketBase auf einem eigenen Server hosten (localhost:8090 in Entwicklung),
und später auf Exoscale deployen möchten:

### Deployment-Optionen

1. **Exoscale Compute Instance (VM)**
   - Ubuntu 22.04 LTS VM
   - PocketBase Binary installieren
   - HTTPS mit Let's Encrypt (Caddy/Nginx)
   - DPA erforderlich ✅

2. **Exoscale Kubernetes (SKS)**
   - Containerisiertes Deployment
   - Höhere Komplexität
   - DPA erforderlich ✅

3. **On-Premise (Schul-Server)**
   - Kein Cloud-Hosting
   - Kein DPA mit Exoscale erforderlich ❌
   - Aber: Eigene Sicherheitsverantwortung

---

## Support-Kontakte

**Exoscale Support:**
- E-Mail: support@exoscale.com
- Website: https://www.exoscale.com/support/
- Dokumentation: https://community.exoscale.com/documentation/

**Datenschutz-Behörde Schweiz (EDÖB):**
- Website: https://www.edoeb.admin.ch/
- Bei Fragen zur nDSG-Konformität

---

## Nächste Schritte

1. ✅ E-Mail an Exoscale vorbereiten (siehe Template oben)
2. ✅ Eigene Account-Details einfügen
3. ✅ E-Mail senden
4. ⏳ Auf Antwort warten (3-7 Tage)
5. ⏳ DPA prüfen und unterzeichnen
6. ✅ DPA archivieren und dokumentieren

---

**Status:** Bereit zum Versand
**Priorität:** Hoch (Compliance-Anforderung)
**Deadline:** Vor Produktiv-Einsatz mit echten Schülerdaten
