# Interactive Onboarding Tour - Flow Dokumentation

Diese Dokumentation beschreibt jeden Schritt der interaktiven Tour.

## Tour-Übersicht

| Phase | Seite | Beschreibung |
|-------|-------|--------------|
| 1 | - | Willkommen-Dialog |
| 2 | /Topics | Thema erstellen |
| 3 | /YearlyOverview | Jahresplanung |
| 4 | /Timetable | Wochenplanung |
| 5 | /Timetable?view=Tag | Tagesansicht |
| 6 | - | Abschluss-Dialog |

---

## Phase 1: Einführung

### Step 0: Willkommen
- **Typ:** `dialog`
- **Target:** keins (zentrierter Dialog)
- **Titel:** "Willkommen!"
- **Inhalt:** "Wir führen dich durch die wichtigsten Funktionen. Du wirst dabei ein Thema erstellen, Lektionen planen und eine Doppellektion anlegen."
- **Aktion:** Benutzer klickt "Weiter"

---

## Phase 2: Themenansicht (/Topics)

### Step 1: Navigation zu Topics
- **Typ:** `navigate`
- **Route:** `/Topics`
- **Automatisch:** Ja (navigiert und geht weiter)

### Step 2: Thema-Karte hervorheben
- **Typ:** `highlight`
- **Target:** `.add-topic-card`
- **Titel:** "Thema erstellen"
- **Inhalt:** "Klicke auf diese Karte, um dein erstes Thema zu erstellen."
- **Wartet auf:** `topic-modal-opened` Event

### Step 3: Thema benennen (im TopicModal)
- **Typ:** `modal-highlight`
- **Target:** `.topic-name-input`
- **Titel:** "Thema benennen"
- **Inhalt:** "Gib deinem Thema einen Namen (z.B. 'Bruchrechnung') und wähle eine Farbe."
- **Aktion:** Benutzer klickt "Weiter"

### Step 4: Lektionen-Tab zeigen
- **Typ:** `modal-highlight`
- **Target:** `[data-value="lessons"]`
- **Titel:** "Lektionen zuweisen"
- **Inhalt:** "Klicke auf den Lektionen-Tab, um Lektionen zu diesem Thema hinzuzufügen."
- **Wartet auf:** `tab-lessons-clicked` Event

### Step 5: Jahresübersicht-Button
- **Typ:** `modal-highlight`
- **Target:** `.assign-lessons-button`
- **Titel:** "In Jahresübersicht zuweisen"
- **Inhalt:** "Klicke hier, um Lektionen in der Jahresübersicht diesem Thema zuzuweisen."
- **Wartet auf:** `navigate-to-yearly-assign` Event

---

## Phase 3: Jahresansicht (/YearlyOverview)

**Hinweis:** Die Navigation erfolgt durch den "Lektionen zuweisen" Button selbst (mit Assign-Modus Parametern: `/yearlyoverview?subject=...&mode=assign&topic=...`).

### Step 6: Lektionen zuweisen (Assign-Modus)
- **Typ:** `highlight`
- **Target:** `.yearly-grid-container`
- **Titel:** "Lektionen zuweisen"
- **Inhalt:** "Du bist jetzt im Zuweisungsmodus. Klicke auf zwei leere Zellen, um sie deinem Thema zuzuweisen. Dann kannst du zurück zum Thema navigieren."
- **Aktion:** Benutzer klickt "Weiter"

### Step 8: Leere Zelle anklicken
- **Typ:** `highlight`
- **Target:** `.week-cell:not(.has-lesson)`
- **Titel:** "Lektion hinzufügen"
- **Inhalt:** "Klicke auf eine leere Zelle, um eine zweite Lektion zu erstellen."
- **Wartet auf:** `lesson-modal-opened` Event

### Step 9: Lektionsschritte (im LessonModal)
- **Typ:** `modal-highlight`
- **Target:** `.lesson-steps-section`
- **Titel:** "Lektionsschritte"
- **Inhalt:** "Du kannst hier auch Schritte für den Unterricht definieren (z.B. 'Einführung 10min', 'Gruppenarbeit 20min')."
- **Aktion:** Benutzer klickt "Weiter"

### Step 10: Doppellektion Toggle
- **Typ:** `modal-highlight`
- **Target:** `.double-lesson-toggle`
- **Titel:** "Doppellektion"
- **Inhalt:** "Aktiviere diesen Toggle, um eine 90-minütige Doppellektion zu erstellen. Speichere dann die Lektion."
- **Wartet auf:** `lesson-saved` Event

### Step 11: Themen-Manager
- **Typ:** `highlight`
- **Target:** `.topic-manager-sidebar`
- **Titel:** "Themen-Manager"
- **Inhalt:** "Hier kannst du Themen auswählen und dann mehrere Zellen auf einmal zuweisen."
- **Aktion:** Benutzer klickt "Weiter"

---

## Phase 4: Wochenansicht (/Timetable)

### Step 12: Navigation zum Stundenplan
- **Typ:** `navigate`
- **Route:** `/Timetable`
- **Automatisch:** Ja

### Step 13: Lektionenpool
- **Typ:** `highlight`
- **Target:** `.lesson-pool-container`
- **Titel:** "Lektionenpool"
- **Inhalt:** "Hier erscheinen alle Lektionen, die du in der Jahresansicht erstellt hast."
- **Aktion:** Benutzer klickt "Weiter"

### Step 14: Lektionen platzieren
- **Typ:** `highlight`
- **Target:** `.timetable-grid`
- **Titel:** "Lektionen platzieren"
- **Inhalt:** "Ziehe die Doppellektion in den Stundenplan. Sie belegt automatisch zwei Zeitslots (90 Minuten)."
- **Wartet auf:** `double-lesson-placed` Event

### Step 15: Doppellektion Erklärung (optional)
- **Typ:** `highlight`
- **Target:** `.timetable-cell.is-double`
- **Titel:** "Doppellektion im Stundenplan"
- **Inhalt:** "Siehst du? Die Doppellektion belegt zwei aufeinanderfolgende Slots."
- **Optional:** Ja (wird übersprungen wenn Target nicht existiert)

### Step 16: Allerlei-Tipp (optional)
- **Typ:** `dialog`
- **Titel:** "Tipp: Allerlei-Lektionen"
- **Inhalt:** "Du kannst auch Lektionen verschiedener Fächer kombinieren: Halte Alt, ziehe eine Lektion auf eine andere."
- **Optional:** Ja

---

## Phase 5: Tagesansicht (/Timetable?view=Tag)

### Step 17: Navigation zur Tagesansicht
- **Typ:** `navigate`
- **Route:** `/Timetable?view=Tag`
- **Automatisch:** Ja

### Step 18: Aktuelle Lektion (optional)
- **Typ:** `highlight`
- **Target:** `.daily-view-current-lesson`
- **Titel:** "Unterrichtsansicht"
- **Inhalt:** "Hier siehst du die aktuell laufende Lektion mit Live-Timer und Fortschrittsanzeige."
- **Optional:** Ja

### Step 19: Lektionsschritte abarbeiten
- **Typ:** `highlight`
- **Target:** `.lesson-steps-list`
- **Titel:** "Lektionsschritte abarbeiten"
- **Inhalt:** "Im Unterricht arbeitest du Schritt für Schritt deine Lektion ab und kannst Schritte abhaken."
- **Aktion:** Benutzer klickt "Weiter"

---

## Phase 6: Abschluss

### Step 20: Gratulation
- **Typ:** `dialog`
- **Titel:** "Gratuliere!"
- **Inhalt:** "Du kennst jetzt die wichtigsten Funktionen von TeacherOrg! Du kannst jederzeit in den Einstellungen Tours wiederholen oder die Hilfe aufrufen."
- **Aktion:** Benutzer klickt "Fertig"

---

## Events Übersicht

| Event | Ausgelöst von | Beschreibung |
|-------|---------------|--------------|
| `topic-modal-opened` | TopicsView | TopicModal wurde geöffnet |
| `tab-lessons-clicked` | TopicModal | Lektionen-Tab wurde angeklickt |
| `navigate-to-yearly-assign` | TopicModal | "Lektionen zuweisen" Button geklickt |
| `lesson-modal-opened` | Diverse | LessonModal wurde geöffnet |
| `lesson-saved` | LessonModal | Lektion wurde gespeichert |
| `double-lesson-placed` | Timetable | Doppellektion wurde platziert |

---

## CSS-Selektoren

| Selektor | Komponente | Beschreibung |
|----------|------------|--------------|
| `.add-topic-card` | AddTopicCard | "Thema erstellen" Karte |
| `.topic-name-input` | TopicModal | Name-Eingabefeld |
| `[data-value="lessons"]` | TopicModal | Lektionen-Tab |
| `.assign-lessons-button` | TopicModal | "Lektionen zuweisen" Button |
| `.yearly-grid-container` | YearlyOverview | Jahresraster Container |
| `.week-cell` | YearlyOverview | Wochen-Zelle |
| `.lesson-steps-section` | LessonModal | Lektionsschritte Bereich |
| `.double-lesson-toggle` | LessonModal | Doppellektion Toggle |
| `.topic-manager-sidebar` | YearlyOverview | Themen-Manager Sidebar |
| `.lesson-pool-container` | Timetable | Lektionenpool |
| `.timetable-grid` | Timetable | Stundenplan Raster |
| `.timetable-cell.is-double` | Timetable | Doppellektion Zelle |
| `.daily-view-current-lesson` | DailyView | Aktuelle Lektion |
| `.lesson-steps-list` | DailyView | Lektionsschritte Liste |
