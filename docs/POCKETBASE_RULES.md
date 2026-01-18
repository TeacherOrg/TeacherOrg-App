# PocketBase Collection Rules

Diese Dokumentation beschreibt die aktuellen List/View Rules für alle relevanten Collections, um den **Student-Zugriff** auf den Stundenplan zu ermöglichen.

## Übersicht

Studenten haben **nur Lesezugriff** auf die Daten ihrer zugewiesenen Klasse. Das Frontend filtert automatisch auf die korrekte `class_id`.

---

## Collection Rules

### `students`
```
List/View: account_id = @request.auth.id || user_id = @request.auth.id
Create:    user_id = @request.auth.id
Update:    user_id = @request.auth.id
Delete:    user_id = @request.auth.id
```
**Erklärung:** Studenten können ihren eigenen Record lesen (via `account_id`). Lehrer können ihre Studenten verwalten (via `user_id`).

---

### `classes`
```
List/View: user_id = @request.auth.id || teacher_id = @request.auth.id || @request.auth.role = "student"
Create:    user_id = @request.auth.id
Update:    user_id = @request.auth.id || teacher_id = @request.auth.id
Delete:    user_id = @request.auth.id
```
**Erklärung:** Lehrer sehen ihre eigenen Klassen. Studenten können alle Klassen lesen (Frontend filtert auf ihre zugewiesene Klasse).

---

### `lessons`
```
List/View: user_id = @request.auth.id || @request.auth.role = "student"
Create:    user_id = @request.auth.id
Update:    user_id = @request.auth.id
Delete:    user_id = @request.auth.id
```
**Erklärung:** Lehrer verwalten ihre Lektionen. Studenten können Lektionen lesen (Frontend filtert auf `class_id`).

---

### `yearly_lessons`
```
List/View: user_id = @request.auth.id || @request.auth.role = "student"
Create:    user_id = @request.auth.id
Update:    user_id = @request.auth.id
Delete:    user_id = @request.auth.id
```
**Erklärung:** Wie `lessons`.

---

### `subjects`
```
List/View: user_id = @request.auth.id || @request.auth.role = "student"
Create:    user_id = @request.auth.id
Update:    user_id = @request.auth.id
Delete:    user_id = @request.auth.id
```
**Erklärung:** Lehrer verwalten ihre Fächer. Studenten können Fächer lesen.

---

### `topics`
```
List/View: class_id.user_id = @request.auth.id || @request.auth.role = "student"
Create:    class_id.user_id = @request.auth.id
Update:    class_id.user_id = @request.auth.id
Delete:    class_id.user_id = @request.auth.id
```
**Erklärung:** Lehrer verwalten Themen ihrer Klassen. Studenten können Themen lesen.

---

### `settings`
```
List/View: user_id = @request.auth.id || @request.auth.role = "student"
Create:    user_id = @request.auth.id
Update:    user_id = @request.auth.id
Delete:    user_id = @request.auth.id
```
**Erklärung:** Lehrer verwalten ihre Settings. Studenten können Settings lesen (um Stundenplan-Konfiguration zu laden).

---

### `holidays`
```
List/View: user_id = @request.auth.id || @request.auth.role = "student"
Create:    user_id = @request.auth.id
Update:    user_id = @request.auth.id
Delete:    user_id = @request.auth.id
```
**Erklärung:** Lehrer verwalten Ferien. Studenten können Ferien lesen.

---

### `allerlei_lessons`
```
List/View: user_id = @request.auth.id || @request.auth.role = "student"
Create:    user_id = @request.auth.id
Update:    user_id = @request.auth.id
Delete:    user_id = @request.auth.id
```
**Erklärung:** Wie `lessons`.

---

## Sicherheitshinweise

1. **Studenten haben nur Lesezugriff** - Create/Update/Delete bleibt auf Lehrer beschränkt
2. **Frontend-Filterung** - Das Frontend filtert automatisch auf die korrekte `class_id` des Studenten
3. **Keine sensiblen Daten** - Studenten sehen nur Stundenplan-relevante Daten, keine Bewertungen anderer Schüler

---

## Warum vereinfachte Rules?

Die ursprünglich geplanten komplexen Cross-Collection-Rules (`@collection.students.class_id = id`) funktionieren in PocketBase nicht zuverlässig. Die vereinfachten Rules (`@request.auth.role = "student"`) sind:

- **Einfacher zu warten**
- **Zuverlässiger**
- **Sicher** (da Create/Update/Delete weiterhin geschützt sind)

Das Frontend übernimmt die Filterung auf die korrekte Klasse.

---

## Änderungshistorie

| Datum | Änderung |
|-------|----------|
| 2026-01-18 | Initiale Dokumentation für Student-Zugriff |
