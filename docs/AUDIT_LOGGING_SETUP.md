# Audit-Logging Setup für PocketBase

## Übersicht

Das Audit-Logging System dokumentiert alle sicherheitsrelevanten Aktionen gemäß nDSG-Anforderungen.

## PocketBase Collection erstellen

### Schritt 1: Im PocketBase Admin einloggen
1. Öffne http://localhost:8090/_/
2. Logge dich als Admin ein

### Schritt 2: Neue Collection erstellen
1. Klicke auf **"New collection"**
2. Wähle **"Base collection"**
3. Name: `audit_logs`

### Schritt 3: Felder hinzufügen

Füge folgende Felder hinzu:

#### 1. **action** (Text, required)
- Type: `Text`
- Name: `action`
- Required: ✅ Ja
- Min length: 1
- Max length: 100

#### 2. **user** (Relation, optional)
- Type: `Relation`
- Name: `user`
- Collection: `users`
- Required: ❌ Nein (bei fehlgeschlagenen Logins gibt es keinen User)
- Single: ✅ Ja (keine Multiple)

#### 3. **target_type** (Text, optional)
- Type: `Text`
- Name: `target_type`
- Required: ❌ Nein
- Max length: 50

#### 4. **target_id** (Text, optional)
- Type: `Text`
- Name: `target_id`
- Required: ❌ Nein
- Max length: 50

#### 5. **details** (JSON, optional)
- Type: `JSON`
- Name: `details`
- Required: ❌ Nein

#### 6. **ip_address** (Text, optional)
- Type: `Text`
- Name: `ip_address`
- Required: ❌ Nein
- Max length: 45 (für IPv6)

#### 7. **success** (Bool, required)
- Type: `Bool`
- Name: `success`
- Required: ✅ Ja

#### 8. **timestamp** (Text, required)
- Type: `Text`
- Name: `timestamp`
- Required: ✅ Ja

### Schritt 4: API Rules konfigurieren

**WICHTIG:** Setze folgende Zugriffsregeln:

- **List/Search Rule:** `@request.auth.id != "" && @request.auth.role = "admin"`
  - Nur Admins können Logs lesen
- **View Rule:** `@request.auth.id != "" && @request.auth.role = "admin"`
  - Nur Admins können einzelne Logs ansehen
- **Create Rule:** `@request.auth.id != ""`
  - Alle authentifizierten Benutzer können Logs erstellen
- **Update Rule:** (leer lassen)
  - Logs dürfen NICHT bearbeitet werden
- **Delete Rule:** (leer lassen)
  - Logs dürfen NICHT gelöscht werden

### Schritt 5: Collection speichern

Klicke auf **"Create"** oder **"Save"**

## Was wird geloggt?

Das System protokolliert automatisch:

### Authentifizierung
- ✅ Erfolgreiche Logins
- ✅ Fehlgeschlagene Login-Versuche
- ✅ Logouts

### Datenzugriff (nDSG-relevant)
- ✅ Zugriff auf Schülerdaten
- ✅ Zugriff auf Notendaten

### Datenänderungen (nDSG-relevant)
- ✅ Schüler erstellen
- ✅ Schüler bearbeiten
- ✅ Schüler löschen
- ✅ Noten erstellen
- ✅ Noten bearbeiten
- ✅ Noten löschen

## Logs anzeigen (für Admins)

Als Admin kannst du die Logs in PocketBase unter **Collections → audit_logs** einsehen.

### Beispiel-Log-Einträge

**Erfolgreicher Login:**
```json
{
  "action": "login",
  "user": "user_id_123",
  "success": true,
  "timestamp": "2026-01-10T14:30:00.000Z",
  "details": {"email": "teacher@example.com"}
}
```

**Schüler anzeigen:**
```json
{
  "action": "view_students_overview",
  "user": "user_id_123",
  "target_type": "students",
  "success": true,
  "timestamp": "2026-01-10T14:35:00.000Z"
}
```

**Note erstellen:**
```json
{
  "action": "create_grade",
  "user": "user_id_123",
  "target_type": "grade",
  "target_id": "grade_id_456",
  "success": true,
  "timestamp": "2026-01-10T14:40:00.000Z",
  "details": {"student_id": "student_id_789", "subject": "Mathematik"}
}
```

## Aufbewahrungsfristen (nDSG)

Gemäß nDSG sollten Audit-Logs mindestens **12 Monate** aufbewahrt werden.

**Empfohlene Maßnahme:**
- Erstelle regelmäßig Backups der `audit_logs` Collection
- Archiviere alte Logs nach 12 Monaten
- Lösche archivierte Logs nach 3 Jahren

## Compliance-Check

✅ Alle Login-Versuche werden protokolliert
✅ Zugriff auf personenbezogene Daten wird protokolliert
✅ Änderungen an personenbezogenen Daten werden protokolliert
✅ Logs sind unveränderlich (Update/Delete Rules leer)
✅ Nur Admins können Logs einsehen
✅ Zeitstempel für alle Aktionen vorhanden

## Nächste Schritte

Nach dem Setup:
1. Teste das Logging durch Login/Logout
2. Teste durch Erstellen/Bearbeiten von Schülerdaten
3. Prüfe in PocketBase Admin, ob Logs korrekt erstellt werden
4. Richte regelmäßige Backups ein (siehe Backup-Strategie im Sicherheitsplan)
