# PocketBase Setup für Student Dashboard

Diese Anleitung beschreibt die notwendigen PocketBase-Änderungen für das Student Dashboard Feature.

---

## 1. Collection: `students` erweitern

Öffne die `students` Collection und füge folgendes Feld hinzu:

| Feld | Typ | Details |
|------|-----|---------|
| `account_id` | Relation | Single, zu `users` Collection, **Nullable** |

**Wichtig:**
- `user_id` bleibt = Lehrer (Ersteller)
- `account_id` = Schüler-Login (wenn erstellt)

### API Rules für students (anpassen):
```
// List Rule
@request.auth.role = 'teacher' || (@request.auth.role = 'student' && account_id = @request.auth.id)

// View Rule
@request.auth.role = 'teacher' || (@request.auth.role = 'student' && account_id = @request.auth.id)
```

---

## 2. Neue Collection: `student_self_assessments`

Erstelle eine neue Collection mit folgenden Feldern:

| Feld | Typ | Details |
|------|-----|---------|
| `student_id` | Relation | Single, zu `students`, Required |
| `competency_id` | Relation | Single, zu `competencies`, Required |
| `self_score` | Number | Min: 1, Max: 5, Required |
| `notes` | Text | Optional, Max 1000 |
| `date` | Date | Required |

### API Rules:
```
// List Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// View Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// Create Rule
student_id.account_id = @request.auth.id

// Update Rule
student_id.account_id = @request.auth.id

// Delete Rule
student_id.account_id = @request.auth.id
```

---

## 3. Neue Collection: `competency_goals`

Erstelle eine neue Collection mit folgenden Feldern:

| Feld | Typ | Details |
|------|-----|---------|
| `student_id` | Relation | Single, zu `students`, Required |
| `competency_id` | Relation | Single, zu `competencies`, Required |
| `goal_text` | Text | Required, Max 500 |
| `created_by` | Relation | Single, zu `users`, Required |
| `creator_role` | Select | Options: `student`, `teacher`, Required |
| `is_completed` | Bool | Default: false |
| `completed_date` | Date | Nullable |
| `completed_by` | Relation | Single, zu `users`, Nullable |

### API Rules:
```
// List Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// View Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// Create Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// Update Rule (Abhaken erlaubt für beide)
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// Delete Rule (Nur eigene Ziele oder Lehrer)
@request.auth.role = 'teacher' || (created_by = @request.auth.id && creator_role = 'student')
```

---

## 4. Bestehende Collections anpassen (API Rules)

### `performances` - Schüler-Lesezugriff hinzufügen:
```
// List Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// View Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// Create/Update/Delete - nur Teacher
@request.auth.role = 'teacher'
```

### `ueberfachliche_kompetenzen` - Schüler-Lesezugriff:
```
// List Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// View Rule
@request.auth.role = 'teacher' || student_id.account_id = @request.auth.id

// Create/Update/Delete - nur Teacher
@request.auth.role = 'teacher'
```

### `lessons` - Schüler Read-Only:
```
// List Rule (Schüler dürfen lesen, Filterung nach Klasse erfolgt im Frontend)
@request.auth.role = 'teacher' || @request.auth.role = 'student'

// View Rule
@request.auth.role = 'teacher' || @request.auth.role = 'student'

// Create/Update/Delete - nur Teacher
@request.auth.role = 'teacher'
```

**Hinweis:** Die Filterung nach Klasse erfolgt im Frontend. PocketBase unterstützt keine `_via_` Reverse-Relation-Syntax in API Rules. Das Frontend filtert automatisch nur die Lektionen der Klasse des eingeloggten Schülers.

---

## 5. Users Collection - Student Role

Stelle sicher, dass bei der Erstellung von Schüler-Accounts die Rolle `student` gesetzt wird:

```javascript
// Beim Erstellen eines Schüler-Accounts
{
  email: "schueler@example.com",
  password: "generiert",
  passwordConfirm: "generiert",
  role: "student",  // <-- Wichtig!
  name: "Max Mustermann"
}
```

---

## Checkliste

- [ ] `students.account_id` Feld hinzugefügt
- [ ] Collection `student_self_assessments` erstellt
- [ ] Collection `competency_goals` erstellt
- [ ] API Rules für `students` angepasst
- [ ] API Rules für `performances` angepasst
- [ ] API Rules für `ueberfachliche_kompetenzen` angepasst
- [ ] API Rules für `lessons` angepasst
