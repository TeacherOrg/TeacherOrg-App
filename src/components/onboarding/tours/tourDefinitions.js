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
        content: 'Wir führen dich durch die wichtigsten Funktionen. Du wirst dabei ein Thema erstellen, Lektionen planen und eine Doppellektion anlegen.',
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
        content: 'Gib deinem Thema einen Namen (z.B. "Bruchrechnung") und wähle eine Farbe. Klicke dann auf Speichern.',
        placement: 'right',
        waitForAction: 'topic-created' // Warte bis Topic gespeichert
      },
      {
        id: 'topic-lesson-edit',
        type: 'highlight',
        target: '.topic-card:first-child',
        title: 'Super! Thema erstellt',
        content: 'Klicke jetzt auf dein Thema, um die erste Lektion zu bearbeiten.',
        placement: 'bottom',
        waitForAction: 'lesson-modal-opened'
      },
      {
        id: 'lesson-modal-intro',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.lesson-title-input',
        title: 'Lektionsdetails',
        content: 'Hier kannst du Titel, Schritte, Notizen und Materialien für deine Lektion eintragen. Fülle mindestens den Titel aus.',
        placement: 'right',
        waitForAction: 'lesson-saved'
      },

      // JAHRESANSICHT (Navigate to /YearlyOverview)
      {
        id: 'navigate-to-yearly',
        type: 'navigate',
        route: '/YearlyOverview',
        title: 'Jahresplanung',
        content: 'Jetzt gehen wir zur Jahresansicht, um eine zweite Lektion zu planen.',
      },
      {
        id: 'yearly-grid-intro',
        type: 'highlight',
        target: '.yearly-grid-container',
        title: 'Jahresansicht',
        content: 'Hier siehst du alle 52 Wochen. Jede Zelle ist eine Woche für ein bestimmtes Fach.',
        placement: 'center'
      },
      {
        id: 'click-week-cell',
        type: 'highlight',
        target: '.week-cell:not(.has-lesson)', // Erste leere Zelle
        title: 'Lektion hinzufügen',
        content: 'Klicke auf eine leere Zelle, um eine zweite Lektion zu erstellen.',
        placement: 'bottom',
        waitForAction: 'lesson-modal-opened'
      },
      {
        id: 'lesson-modal-yearly',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.lesson-steps-section',
        title: 'Lektionsschritte',
        content: 'Du kannst hier auch Schritte für den Unterricht definieren (z.B. "Einführung 10min", "Gruppenarbeit 20min").',
        placement: 'left'
      },
      {
        id: 'double-lesson-toggle',
        type: 'modal-highlight',
        modalType: 'LessonModal',
        target: '.double-lesson-toggle',
        title: 'Doppellektion',
        content: 'Aktiviere diesen Toggle, um eine 90-minütige Doppellektion zu erstellen. Speichere dann die Lektion.',
        placement: 'right',
        waitForAction: 'lesson-saved'
      },
      {
        id: 'topic-manager-highlight',
        type: 'highlight',
        target: '.topic-manager-sidebar',
        title: 'Themen-Manager',
        content: 'Hier kannst du Themen auswählen und dann mehrere Zellen auf einmal zuweisen.',
        placement: 'left'
      },

      // WOCHENANSICHT (Navigate to /Timetable)
      {
        id: 'navigate-to-timetable',
        type: 'navigate',
        route: '/Timetable',
        title: 'Wochenplanung',
        content: 'Jetzt schauen wir uns den wöchentlichen Stundenplan an.',
      },
      {
        id: 'lesson-pool',
        type: 'highlight',
        target: '.lesson-pool-container',
        title: 'Lektionenpool',
        content: 'Hier erscheinen alle Lektionen, die du in der Jahresansicht erstellt hast.',
        placement: 'right'
      },
      {
        id: 'drag-lessons',
        type: 'highlight',
        target: '.timetable-grid',
        title: 'Lektionen platzieren',
        content: 'Ziehe die Doppellektion in den Stundenplan. Sie belegt automatisch zwei Zeitslots (90 Minuten).',
        placement: 'center',
        waitForAction: 'double-lesson-placed'
      },
      {
        id: 'double-lesson-explanation',
        type: 'highlight',
        target: '.timetable-cell.is-double',
        title: 'Doppellektion im Stundenplan',
        content: 'Siehst du? Die Doppellektion belegt zwei aufeinanderfolgende Slots. Perfekt für längere Unterrichtseinheiten!',
        placement: 'bottom',
        optional: true
      },
      {
        id: 'allerlei-hint',
        type: 'dialog',
        title: 'Tipp: Allerlei-Lektionen 💡',
        content: 'Du kannst auch Lektionen verschiedener Fächer kombinieren: Halte Alt, ziehe eine Lektion auf eine andere. Das erstellt eine "Allerlei-Lektion" mit gemischten Fächern. Probiere es später aus!',
        placement: 'center',
        optional: true
      },

      // TAGESANSICHT (Navigate to /Timetable?view=Tag)
      {
        id: 'navigate-to-daily',
        type: 'navigate',
        route: '/Timetable?view=Tag',
        title: 'Tagesansicht',
        content: 'Zum Schluss schauen wir uns die Tagesansicht an - deine Ansicht für den Unterricht.',
      },
      {
        id: 'daily-view-intro',
        type: 'highlight',
        target: '.daily-view-current-lesson',
        title: 'Unterrichtsansicht',
        content: 'Hier siehst du die aktuell laufende Lektion mit Live-Timer und Fortschrittsanzeige.',
        placement: 'top',
        optional: true
      },
      {
        id: 'lesson-steps-daily',
        type: 'highlight',
        target: '.lesson-steps-list',
        title: 'Lektionsschritte abarbeiten',
        content: 'Im Unterricht arbeitest du Schritt für Schritt deine Lektion ab und kannst Schritte abhaken.',
        placement: 'left'
      },

      // ABSCHLUSS
      {
        id: 'completion',
        type: 'dialog',
        title: 'Gratuliere! 🎉',
        content: 'Du kennst jetzt die wichtigsten Funktionen von TeacherOrg! Du kannst jederzeit in den Einstellungen Tours wiederholen oder die Hilfe aufrufen.',
        placement: 'center',
        actions: ['finish']
      }
    ]
  }
};
