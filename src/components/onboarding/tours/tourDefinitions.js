export const TOURS = {
  INTERACTIVE_ONBOARDING: {
    id: 'interactive-onboarding',
    name: 'Interaktive Onboarding Tour',
    isInteractive: true, // Flag für interaktive Tour
    steps: [
      // INTRO
      {
        id: 'intro',
        type: 'dialog', // Zeigt Dialog statt Highlight
        title: 'Willkommen! 🎉',
        content: 'Wir führen dich durch die wichtigsten Funktionen. Du wirst dabei ein Demo-Thema erstellen, Lektionen planen und eine Doppellektion anlegen. Dieses Thema wird nach der Tour automatisch gelöscht.',
        actions: ['next'],
        placement: 'center'
      },

      // THEMENANSICHT (Navigate to /Topics)
      {
        id: 'navigate-to-topics',
        type: 'navigate',
        route: '/Topics',
        title: 'Themen erstellen',
        content: 'Zuerst erstellen wir ein Thema. Themen helfen dir, deine Lektionen zu organisieren.',
      },
      {
        id: 'highlight-add-topic',
        type: 'highlight',
        target: '.add-topic-card',
        title: 'Thema erstellen',
        content: 'Klicke auf diese Karte, um dein erstes Thema zu erstellen.',
        placement: 'bottom',
        waitForAction: 'topic-modal-opened' // Warte bis TopicModal öffnet
      },
      {
        id: 'topic-modal-fields',
        type: 'modal-highlight',
        modalType: 'TopicModal',
        target: '.topic-name-input',
        title: 'Thema benennen',
        content: 'Gib deinem Thema einen Namen (z.B. "Bruchrechnung") und wähle eine Farbe.',
        placement: 'right'
        // Kein waitForAction - Benutzer klickt "Weiter"
      },
      {
        id: 'topic-lessons-tab',
        type: 'modal-highlight',
        modalType: 'TopicModal',
        target: '.lessons-tab-trigger',
        title: 'Lektionen zuweisen',
        content: 'Klicke auf den Lektionen-Tab, um Lektionen zu diesem Thema hinzuzufügen.',
        placement: 'bottom',
        offset: { y: 10 },
        waitForAction: 'tab-lessons-clicked'
      },
      {
        id: 'topic-assign-lessons-btn',
        type: 'modal-highlight',
        modalType: 'TopicModal',
        target: '.assign-lessons-button',
        title: 'In Jahresübersicht zuweisen',
        content: 'Klicke hier, um Lektionen in der Jahresübersicht diesem Thema zuzuweisen.',
        placement: 'top',
        waitForAction: 'navigate-to-yearly-assign'
      },

      // JAHRESANSICHT (Button navigiert bereits mit Assign-Modus Parametern)
      {
        id: 'yearly-grid-intro',
        type: 'highlight',
        target: '.yearly-grid-container',
        title: 'Lektionen zuweisen',
        content: 'Du bist jetzt im Zuweisungsmodus. Klicke auf zwei leere Zellen, um sie deinem Thema zuzuweisen. Klicke dann auf "Zuweisen & Zurück".',
        placement: 'right',
        waitForAction: 'returned-to-topic-lessons'
      },

      // ZURÜCK ZUM TOPICMODAL (nach Zuweisung)
      {
        id: 'returned-to-lessons-tab',
        type: 'modal-highlight',
        modalType: 'TopicModal',
        target: '.lesson-card',
        title: 'Deine zugewiesenen Lektionen',
        content: 'Hier siehst du die Lektionen, die du soeben zugewiesen hast. Klicke auf eine Lektion, um sie zu bearbeiten.',
        placement: 'right',
        waitForAction: 'lesson-clicked'
      },
      {
        id: 'lesson-modal-steps',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.lesson-steps-section',
        title: 'Arbeitsschritt hinzufügen',
        content: 'Füge einen Arbeitsschritt hinzu. Du kannst Zeit, Arbeitsform, Arbeitsschritt und Material definieren.',
        placement: 'right'
      },
      {
        id: 'save-close-first-lesson',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.lesson-save-button',
        title: 'Lektion speichern',
        content: 'Speichere die Lektion mit den Schritten. Danach navigieren wir zur Jahresansicht für die zweite Lektion.',
        placement: 'top',
        waitForAction: 'lesson-saved'
      },
      {
        id: 'navigate-to-yearly-for-double',
        type: 'navigate',
        route: '/yearlyoverview',
        title: 'Zur Jahresansicht',
        content: 'Navigiere zur Jahresansicht. Dort findest du deine Lektionen in den Themenzellen.'
      },
      {
        id: 'yearly-topic-cell',
        type: 'highlight',
        target: '.yearly-topic-cell',
        title: 'Deine Themenlektionen',
        content: 'Hier siehst du deine Themenlektionen in der Jahresansicht. Auch hier können die Lektionen bearbeitet werden. Klicke darauf, um die Lektionen dieser Woche zu bearbeiten - wir machen die zwei Lektionen zu einer Doppellektion.',
        placement: 'bottom',
        waitForAction: 'topic-lessons-modal-opened'
      },
      {
        id: 'topic-lessons-first-lesson',
        type: 'modal-highlight',
        modalType: 'TopicLessonsModal',
        target: '.topic-lesson-cell.first-lesson',
        title: 'Erste Lektion',
        content: 'Klicke auf die erste Lektion, um sie zu bearbeiten und als Doppellektion zu markieren.',
        placement: 'right',
        waitForAction: 'lesson-modal-opened'
      },
      {
        id: 'double-lesson-toggle',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.double-lesson-toggle',
        title: 'Doppellektion',
        content: 'Aktiviere diesen Toggle, um diese Lektion als 90-minütige Doppellektion zu markieren.',
        placement: 'bottom',
        waitForAction: 'double-lesson-toggled'
      },
      {
        id: 'steps-edit-info',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.lesson-steps-section',
        title: 'Erste Lektion – Schritte',
        content: 'Hier sind die Schritte der ersten Lektion der Doppellektion.',
        placement: 'right'
      },
      {
        id: 'second-steps-info',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.second-lesson-steps-section',
        title: 'Zweite Lektion – Schritte',
        content: 'Und hier die Schritte der zweiten Lektion. Du kannst beide unabhängig bearbeiten.',
        placement: 'right'
      },
      {
        id: 'toggles-info',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.lesson-toggles-row',
        title: 'Weitere Optionen',
        content: 'Mit "Prüfung" wird ein (!) Symbol angezeigt. "Halbklasse"-Lektionen können im Stundenplan zwei Mal geplant werden (werden kopiert).',
        placement: 'bottom'
      },
      {
        id: 'lesson-title-info',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.lesson-title-input',
        title: 'Lektionstitel',
        content: 'Gib deiner Lektion einen aussagekräftigen Titel für bessere Übersicht.',
        placement: 'bottom'
      },
      {
        id: 'save-template-hint',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.save-template-button',
        title: 'Tipp: Vorlage speichern',
        content: 'Du kannst deine Schritte als Vorlage speichern und später wiederverwenden.',
        placement: 'left',
        optional: true
      },
      {
        id: 'save-and-weekly',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.lesson-save-button',
        title: 'Speichern',
        content: 'Speichere die Doppellektion.',
        placement: 'top',
        waitForAction: 'lesson-saved'
      },
      {
        id: 'week-view-button',
        type: 'highlight',
        target: '.view-button-woche',
        title: 'Zur Wochenansicht',
        content: 'Klicke auf "Woche", um zur Wochenansicht zu wechseln. Dort siehst du deine Doppellektion im Stundenplan.',
        placement: 'bottom',
        waitForAction: 'view-changed-to-week'
      },

      // WOCHENANSICHT (User klickt auf Woche-Button)
      {
        id: 'welcome-to-timetable',
        type: 'dialog',
        title: 'Wochenplanung',
        content: 'Willkommen in der Wochenansicht! Hier kannst du Lektionen aus dem Pool in den Stundenplan ziehen.',
        placement: 'center'
      },
      {
        id: 'drag-lessons',
        type: 'highlight',
        target: '.timetable-pool-container',
        title: 'Lektionenpool',
        content: 'Hier siehst du alle erstellten Lektionen. Ziehe eine Lektion aus dem Pool in den Stundenplan. Doppellektionen belegen automatisch zwei Slots.',
        placement: 'bottom',
        waitForAction: 'double-lesson-placed'
      },
      {
        id: 'double-lesson-explanation',
        type: 'highlight',
        target: '.timetable-cell.is-double',
        title: 'Doppellektion im Stundenplan',
        content: 'Deine Doppellektion ist jetzt eingeplant und belegt zwei Slots. Du kannst Lektionen jederzeit per Drag & Drop im Stundenplan verschieben oder in den Pool zurückziehen.',
        placement: 'bottom',
        optional: true
      },
      {
        id: 'allerlei-hint',
        type: 'dialog',
        title: 'Tipp: Allerlei-Lektionen 🌈',
        content: 'Du kannst auch Lektionen verschiedener Fächer kombinieren: Halte Alt, ziehe eine Lektion auf eine andere. Das erstellt eine "Allerlei-Lektion" mit gemischten Fächern. Probiere es später aus!',
        placement: 'center',
        optional: true
      },
      {
        id: 'weekly-complete',
        type: 'dialog',
        title: 'Wochenansicht verstanden!',
        content: 'Perfekt! Du hast gelernt, wie du Lektionen aus dem Pool in den Stundenplan ziehst. Lass uns nun kurz die Tagesansicht ansehen.',
        placement: 'center'
      },

      // TAGESANSICHT (User klickt auf Tag-Button)
      {
        id: 'daily-view-button',
        type: 'highlight',
        target: '.view-button-tag',
        title: 'Zur Tagesansicht',
        content: 'Klicke auf "Tag", um die Tagesansicht zu öffnen - deine Ansicht für den Unterricht.',
        placement: 'bottom',
        waitForAction: 'view-changed-to-daily'
      },

      // TAGESANSICHT - Lektionsübersicht
      {
        id: 'daily-lesson-sequence',
        type: 'highlight',
        target: '.lesson-overview-panel',
        title: 'Lektionsabfolge',
        content: 'Hier siehst du die Lektionen des Tages in der geplanten Reihenfolge.',
        placement: 'right',
        waitForAction: 'daily-lesson-clicked'
      },
      {
        id: 'daily-detail-view',
        type: 'highlight',
        target: '.lesson-detail-panel',
        title: 'Lektionsdetails',
        content: 'Hier siehst du und deine Klasse alle Informationen zur ausgewählten Lektion: Arbeitsschritte, Materialien, Zeit und Arbeitsform.',
        placement: 'left'
      },
      {
        id: 'daily-controls-hint',
        type: 'highlight',
        target: '.daily-view-controls',
        title: 'Praktische Funktionen',
        content: 'Nutze diese Buttons für: Einstellungen, Ämtli-Zuweisung, Pausentimer und Vollbildmodus.',
        placement: 'bottom'
      },

      // ABSCHLUSS
      {
        id: 'completion',
        type: 'dialog',
        title: 'Gratuliere! 🎉',
        content: 'Du hast die Grundlagen gemeistert! Das Demo-Thema wird nun automatisch gelöscht. Du kannst jetzt deine eigenen Themen erstellen.',
        placement: 'center',
        actions: ['finish']
      }
    ]
  }
};
