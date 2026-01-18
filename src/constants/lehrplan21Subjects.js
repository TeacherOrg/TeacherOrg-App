/**
 * Lehrplan 21 Fächer und Fachbereiche
 *
 * Vordefinierte Fächer der Schweizer Volksschule nach Lehrplan 21
 * Referenz: docs/LEHRPLAN21_FAECHER.md
 */

// Zyklen-Definition
export const LEHRPLAN_ZYKLEN = {
  ZYKLUS_1: {
    id: 'zyklus_1',
    name: 'Zyklus 1',
    description: 'Kindergarten - 2. Klasse',
    grades: ['KG1', 'KG2', '1', '2']
  },
  ZYKLUS_2: {
    id: 'zyklus_2',
    name: 'Zyklus 2',
    description: '3. - 6. Klasse',
    grades: ['3', '4', '5', '6']
  },
  ZYKLUS_3: {
    id: 'zyklus_3',
    name: 'Zyklus 3',
    description: '7. - 9. Klasse (Oberstufe)',
    grades: ['7', '8', '9']
  }
};

// Fachbereiche (übergeordnete Kategorien)
export const FACHBEREICHE_KATEGORIEN = {
  SPRACHEN: { id: 'sprachen', name: 'Sprachen', color: '#3b82f6' },
  MATHEMATIK: { id: 'mathematik', name: 'Mathematik', color: '#eab308' },
  NMG: { id: 'nmg', name: 'Natur, Mensch, Gesellschaft', color: '#22c55e' },
  GESTALTEN: { id: 'gestalten', name: 'Gestalten', color: '#d946ef' },
  MUSIK: { id: 'musik', name: 'Musik', color: '#ec4899' },
  BEWEGUNG_SPORT: { id: 'bewegung_sport', name: 'Bewegung und Sport', color: '#f97316' },
  MEDIEN_INFORMATIK: { id: 'medien_informatik', name: 'Medien und Informatik', color: '#0ea5e9' },
  BERUFLICHE_ORIENTIERUNG: { id: 'bo', name: 'Berufliche Orientierung', color: '#8b5cf6' }
};

// Vordefinierte LP21 Fächer
export const PREDEFINED_SUBJECTS = [
  // ===== SPRACHEN =====
  {
    lp21_id: 'deutsch',
    name: 'Deutsch',
    shortName: 'D',
    emoji: '📖',
    defaultColor: '#3b82f6',
    fachbereich: 'sprachen',
    zyklen: ['zyklus_1', 'zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_1: 5, zyklus_2: 5, zyklus_3: 4 },
    is_core_subject: true
  },
  {
    lp21_id: 'franzoesisch',
    name: 'Französisch',
    shortName: 'F',
    emoji: '🇫🇷',
    defaultColor: '#ef4444',
    fachbereich: 'sprachen',
    zyklen: ['zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_2: 3, zyklus_3: 3 },
    is_core_subject: true
  },
  {
    lp21_id: 'englisch',
    name: 'Englisch',
    shortName: 'E',
    emoji: '🇬🇧',
    defaultColor: '#10b981',
    fachbereich: 'sprachen',
    zyklen: ['zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_2: 2, zyklus_3: 3 },
    is_core_subject: true
  },
  {
    lp21_id: 'italienisch',
    name: 'Italienisch',
    shortName: 'I',
    emoji: '🇮🇹',
    defaultColor: '#22c55e',
    fachbereich: 'sprachen',
    zyklen: ['zyklus_3'],
    defaultLessonsPerWeek: { zyklus_3: 3 },
    is_core_subject: false
  },
  {
    lp21_id: 'latein',
    name: 'Latein',
    shortName: 'L',
    emoji: '🏛️',
    defaultColor: '#a78bfa',
    fachbereich: 'sprachen',
    zyklen: ['zyklus_3'],
    defaultLessonsPerWeek: { zyklus_3: 3 },
    is_core_subject: false
  },
  {
    lp21_id: 'spanisch',
    name: 'Spanisch',
    shortName: 'SP',
    emoji: '🇪🇸',
    defaultColor: '#fbbf24',
    fachbereich: 'sprachen',
    zyklen: ['zyklus_3'],
    defaultLessonsPerWeek: { zyklus_3: 3 },
    is_core_subject: false
  },

  // ===== MATHEMATIK =====
  {
    lp21_id: 'mathematik',
    name: 'Mathematik',
    shortName: 'MA',
    emoji: '🧮',
    defaultColor: '#eab308',
    fachbereich: 'mathematik',
    zyklen: ['zyklus_1', 'zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_1: 5, zyklus_2: 5, zyklus_3: 4 },
    is_core_subject: true
  },

  // ===== NATUR, MENSCH, GESELLSCHAFT =====
  // Integriertes Fach für Zyklus 1 & 2
  {
    lp21_id: 'nmg',
    name: 'NMG',
    fullName: 'Natur, Mensch, Gesellschaft',
    shortName: 'NMG',
    emoji: '🌍',
    defaultColor: '#22c55e',
    fachbereich: 'nmg',
    zyklen: ['zyklus_1', 'zyklus_2'],
    defaultLessonsPerWeek: { zyklus_1: 4, zyklus_2: 6 },
    is_core_subject: false
  },

  // NMG-Split für Zyklus 3
  {
    lp21_id: 'natur_technik',
    name: 'Natur und Technik',
    shortName: 'NT',
    emoji: '🔬',
    defaultColor: '#22c55e',
    fachbereich: 'nmg',
    zyklen: ['zyklus_3'],
    defaultLessonsPerWeek: { zyklus_3: 3 },
    is_core_subject: false
  },
  {
    lp21_id: 'rzg',
    name: 'Räume, Zeiten, Gesellschaften',
    shortName: 'RZG',
    emoji: '🗺️',
    defaultColor: '#a78bfa',
    fachbereich: 'nmg',
    zyklen: ['zyklus_3'],
    defaultLessonsPerWeek: { zyklus_3: 3 },
    is_core_subject: false
  },
  {
    lp21_id: 'erg',
    name: 'Ethik, Religionen, Gemeinschaft',
    shortName: 'ERG',
    emoji: '🙏',
    defaultColor: '#f59e0b',
    fachbereich: 'nmg',
    zyklen: ['zyklus_3'],
    defaultLessonsPerWeek: { zyklus_3: 1 },
    is_core_subject: false
  },
  {
    lp21_id: 'wah',
    name: 'WAH',
    fullName: 'Wirtschaft, Arbeit, Haushalt',
    shortName: 'WAH',
    emoji: '💰',
    defaultColor: '#84cc16',
    fachbereich: 'nmg',
    zyklen: ['zyklus_3'],
    defaultLessonsPerWeek: { zyklus_3: 2 },
    is_core_subject: false
  },

  // ===== GESTALTEN =====
  {
    lp21_id: 'bildnerisches_gestalten',
    name: 'Bildnerisches Gestalten',
    shortName: 'BG',
    emoji: '🎨',
    defaultColor: '#d946ef',
    fachbereich: 'gestalten',
    zyklen: ['zyklus_1', 'zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_1: 2, zyklus_2: 2, zyklus_3: 2 },
    is_core_subject: false
  },
  {
    lp21_id: 'ttg',
    name: 'TTG',
    fullName: 'Textiles und Technisches Gestalten',
    shortName: 'TTG',
    emoji: '🔧',
    defaultColor: '#f97316',
    fachbereich: 'gestalten',
    zyklen: ['zyklus_1', 'zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_1: 2, zyklus_2: 4, zyklus_3: 4 },
    is_core_subject: false
  },

  // ===== MUSIK =====
  {
    lp21_id: 'musik',
    name: 'Musik',
    shortName: 'MU',
    emoji: '🎶',
    defaultColor: '#ec4899',
    fachbereich: 'musik',
    zyklen: ['zyklus_1', 'zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_1: 2, zyklus_2: 2, zyklus_3: 1 },
    is_core_subject: false
  },

  // ===== BEWEGUNG UND SPORT =====
  {
    lp21_id: 'bewegung_sport',
    name: 'Bewegung und Sport',
    shortName: 'BS',
    emoji: '🏀',
    defaultColor: '#f97316',
    fachbereich: 'bewegung_sport',
    zyklen: ['zyklus_1', 'zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_1: 3, zyklus_2: 3, zyklus_3: 3 },
    is_core_subject: false
  },

  // ===== MEDIEN UND INFORMATIK =====
  {
    lp21_id: 'medien_informatik',
    name: 'Medien und Informatik',
    shortName: 'MI',
    emoji: '💻',
    defaultColor: '#0ea5e9',
    fachbereich: 'medien_informatik',
    zyklen: ['zyklus_1', 'zyklus_2', 'zyklus_3'],
    defaultLessonsPerWeek: { zyklus_1: 1, zyklus_2: 1, zyklus_3: 2 },
    is_core_subject: false
  },

  // ===== BERUFLICHE ORIENTIERUNG (nur Zyklus 3) =====
  {
    lp21_id: 'berufliche_orientierung',
    name: 'Berufliche Orientierung',
    shortName: 'BO',
    emoji: '💼',
    defaultColor: '#8b5cf6',
    fachbereich: 'bo',
    zyklen: ['zyklus_3'],
    defaultLessonsPerWeek: { zyklus_3: 1 },
    is_core_subject: false
  }
];

// Fachbereiche (Bewertungskategorien) pro Fach
export const FACHBEREICHE_BY_SUBJECT = {
  // Sprachen (gemeinsame Fachbereiche für alle Sprachfächer)
  deutsch: [
    { id: 'hoeren', name: 'Hören', fullName: 'Hörverstehen' },
    { id: 'lesen', name: 'Lesen', fullName: 'Leseverstehen' },
    { id: 'sprechen', name: 'Sprechen', fullName: 'Mündliche Produktion' },
    { id: 'schreiben', name: 'Schreiben', fullName: 'Schriftliche Produktion' },
    { id: 'sprache_fokus', name: 'Sprache im Fokus', fullName: 'Grammatik, Wortschatz' },
    { id: 'literatur_fokus', name: 'Literatur im Fokus' }
  ],
  franzoesisch: [
    { id: 'hoeren', name: 'Hören', fullName: 'Hörverstehen' },
    { id: 'lesen', name: 'Lesen', fullName: 'Leseverstehen' },
    { id: 'sprechen', name: 'Sprechen', fullName: 'Mündliche Produktion' },
    { id: 'schreiben', name: 'Schreiben', fullName: 'Schriftliche Produktion' },
    { id: 'sprache_fokus', name: 'Sprache im Fokus', fullName: 'Grammatik, Wortschatz' }
  ],
  englisch: [
    { id: 'hoeren', name: 'Hören', fullName: 'Hörverstehen' },
    { id: 'lesen', name: 'Lesen', fullName: 'Leseverstehen' },
    { id: 'sprechen', name: 'Sprechen', fullName: 'Mündliche Produktion' },
    { id: 'schreiben', name: 'Schreiben', fullName: 'Schriftliche Produktion' },
    { id: 'sprache_fokus', name: 'Sprache im Fokus', fullName: 'Grammatik, Wortschatz' }
  ],
  italienisch: [
    { id: 'hoeren', name: 'Hören', fullName: 'Hörverstehen' },
    { id: 'lesen', name: 'Lesen', fullName: 'Leseverstehen' },
    { id: 'sprechen', name: 'Sprechen', fullName: 'Mündliche Produktion' },
    { id: 'schreiben', name: 'Schreiben', fullName: 'Schriftliche Produktion' },
    { id: 'sprache_fokus', name: 'Sprache im Fokus', fullName: 'Grammatik, Wortschatz' }
  ],
  latein: [
    { id: 'lesen', name: 'Lesen', fullName: 'Leseverstehen' },
    { id: 'sprache_fokus', name: 'Sprache im Fokus', fullName: 'Grammatik, Wortschatz' },
    { id: 'kulturwissen', name: 'Kulturwissen', fullName: 'Römische Kultur und Geschichte' }
  ],
  spanisch: [
    { id: 'hoeren', name: 'Hören', fullName: 'Hörverstehen' },
    { id: 'lesen', name: 'Lesen', fullName: 'Leseverstehen' },
    { id: 'sprechen', name: 'Sprechen', fullName: 'Mündliche Produktion' },
    { id: 'schreiben', name: 'Schreiben', fullName: 'Schriftliche Produktion' },
    { id: 'sprache_fokus', name: 'Sprache im Fokus', fullName: 'Grammatik, Wortschatz' }
  ],

  // Mathematik
  mathematik: [
    { id: 'zahl_variable', name: 'Zahl und Variable' },
    { id: 'form_raum', name: 'Form und Raum' },
    { id: 'groessen_funktionen', name: 'Grössen, Funktionen, Daten und Zufall' }
  ],

  // NMG (Zyklus 1-2)
  nmg: [
    { id: 'identitaet_koerper', name: 'Identität, Körper, Gesundheit' },
    { id: 'tiere_pflanzen', name: 'Tiere, Pflanzen, Lebensräume' },
    { id: 'stoffe_energie', name: 'Stoffe, Energie, Bewegung' },
    { id: 'phaenomene_natur', name: 'Phänomene der belebten und unbelebten Natur' },
    { id: 'technik', name: 'Technische Entwicklungen und Umsetzungen' },
    { id: 'arbeit_konsum', name: 'Arbeit, Produktion, Konsum' },
    { id: 'lebensweisen', name: 'Lebensweisen und Lebensräume' },
    { id: 'raeume', name: 'Menschen nutzen Räume' },
    { id: 'zeit_wandel', name: 'Zeit, Dauer und Wandel' },
    { id: 'gemeinschaft', name: 'Gemeinschaft und Gesellschaft' },
    { id: 'werte_normen', name: 'Grunderfahrungen, Werte, Normen' },
    { id: 'religionen', name: 'Religionen und Weltsichten' }
  ],

  // Natur und Technik (Zyklus 3)
  natur_technik: [
    { id: 'naturwissenschaften', name: 'Wesen und Bedeutung von Naturwissenschaften' },
    { id: 'stoffe_chemie', name: 'Stoffe und ihre Umwandlungen', fullName: 'Chemie' },
    { id: 'mechanik', name: 'Mechanik, Kräfte, Bewegung', fullName: 'Physik' },
    { id: 'optik_akustik', name: 'Optik, Akustik', fullName: 'Physik' },
    { id: 'energie', name: 'Energie', fullName: 'Physik' },
    { id: 'elektrizitaet', name: 'Elektrizität, Magnetismus', fullName: 'Physik' },
    { id: 'zellen', name: 'Zellen, Organismen', fullName: 'Biologie' },
    { id: 'koerperfunktionen', name: 'Körperfunktionen', fullName: 'Biologie' },
    { id: 'oekosysteme', name: 'Ökosysteme', fullName: 'Biologie' },
    { id: 'fortpflanzung', name: 'Fortpflanzung, Entwicklung', fullName: 'Biologie' }
  ],

  // RZG (Zyklus 3)
  rzg: [
    { id: 'natuerliche_grundlagen', name: 'Natürliche Grundlagen der Erde', fullName: 'Geografie' },
    { id: 'lebensweisen_raeume', name: 'Lebensweisen und Lebensräume', fullName: 'Geografie' },
    { id: 'schweiz_tradition', name: 'Schweiz in Tradition und Wandel', fullName: 'Geschichte' },
    { id: 'weltgeschichte', name: 'Weltgeschichtliche Kontinuitäten', fullName: 'Geschichte' }
  ],

  // ERG (Zyklus 3)
  erg: [
    { id: 'existentielle', name: 'Existentielle Grunderfahrungen' },
    { id: 'werte_normen', name: 'Werte und Normen' },
    { id: 'religionen_weltsichten', name: 'Religionen und Weltsichten' },
    { id: 'gemeinschaft_gesellschaft', name: 'Gemeinschaft und Gesellschaft' }
  ],

  // WAH (Zyklus 3)
  wah: [
    { id: 'produktion_arbeit', name: 'Produktions- und Arbeitswelten' },
    { id: 'maerkte_handel', name: 'Märkte und Handel' },
    { id: 'konsum', name: 'Konsum gestalten' },
    { id: 'haushalten', name: 'Haushalten und Zusammenleben' }
  ],

  // Bildnerisches Gestalten
  bildnerisches_gestalten: [
    { id: 'wahrnehmung', name: 'Wahrnehmung und Kommunikation' },
    { id: 'prozesse_produkte', name: 'Prozesse und Produkte' },
    { id: 'kontexte', name: 'Kontexte und Orientierung' }
  ],

  // TTG
  ttg: [
    { id: 'wahrnehmung', name: 'Wahrnehmung und Kommunikation' },
    { id: 'prozesse_produkte', name: 'Prozesse und Produkte' },
    { id: 'kontexte', name: 'Kontexte und Orientierung' }
  ],

  // Musik
  musik: [
    { id: 'singen_sprechen', name: 'Singen und Sprechen' },
    { id: 'hoeren_orientieren', name: 'Hören und Sich-Orientieren' },
    { id: 'bewegen_tanzen', name: 'Bewegen und Tanzen' },
    { id: 'musizieren', name: 'Musizieren' },
    { id: 'gestalten', name: 'Gestalten' },
    { id: 'musikalisches_wissen', name: 'Praxis des musikalischen Wissens' }
  ],

  // Bewegung und Sport
  bewegung_sport: [
    { id: 'laufen_springen', name: 'Laufen, Springen, Werfen' },
    { id: 'geraete', name: 'Bewegen an Geräten' },
    { id: 'darstellen_tanzen', name: 'Darstellen und Tanzen' },
    { id: 'spielen', name: 'Spielen' },
    { id: 'gleiten_rollen', name: 'Gleiten, Rollen, Fahren' },
    { id: 'wasser', name: 'Bewegen im Wasser' }
  ],

  // Medien und Informatik
  medien_informatik: [
    { id: 'medien', name: 'Medien' },
    { id: 'informatik', name: 'Informatik' },
    { id: 'anwendungskompetenzen', name: 'Anwendungskompetenzen' }
  ],

  // Berufliche Orientierung
  berufliche_orientierung: [
    { id: 'persoenlichkeit', name: 'Persönlichkeitsprofil' },
    { id: 'bildungslandschaft', name: 'Bildungslandschaft und Arbeitswelt' },
    { id: 'entscheidung', name: 'Entscheidung und Realisierung' }
  ]
};

// ===== HELPER-FUNKTIONEN =====

/**
 * Gibt alle Fächer für einen bestimmten Zyklus zurück
 */
export const getSubjectsForZyklus = (zyklusId) => {
  return PREDEFINED_SUBJECTS.filter(s => s.zyklen.includes(zyklusId));
};

/**
 * Findet ein Fach anhand der LP21-ID
 */
export const getSubjectByLp21Id = (lp21Id) => {
  return PREDEFINED_SUBJECTS.find(s => s.lp21_id === lp21Id);
};

/**
 * Gibt die Fachbereiche für ein bestimmtes Fach zurück
 */
export const getFachbereicheForSubject = (lp21Id) => {
  return FACHBEREICHE_BY_SUBJECT[lp21Id] || [];
};

/**
 * Gibt die Standard-Lektionen/Woche für ein Fach im gewählten Zyklus zurück
 */
export const getDefaultLessonsPerWeek = (lp21Id, zyklusId) => {
  const subject = getSubjectByLp21Id(lp21Id);
  if (!subject) return 4;
  return subject.defaultLessonsPerWeek[zyklusId] || 4;
};

/**
 * Fuzzy-Matching: Schlägt ein LP21-Fach basierend auf einem benutzerdefinierten Namen vor
 */
export const suggestLp21Match = (customSubjectName) => {
  const normalized = customSubjectName.toLowerCase().trim();

  // Direkte Übereinstimmungen
  const directMatch = PREDEFINED_SUBJECTS.find(s =>
    s.name.toLowerCase() === normalized ||
    s.lp21_id === normalized ||
    s.shortName?.toLowerCase() === normalized ||
    s.fullName?.toLowerCase() === normalized
  );
  if (directMatch) return directMatch;

  // Fuzzy-Mappings (häufige Varianten)
  const fuzzyMappings = {
    'mathe': 'mathematik',
    'math': 'mathematik',
    'rechnen': 'mathematik',
    'de': 'deutsch',
    'fr': 'franzoesisch',
    'franz': 'franzoesisch',
    'französisch': 'franzoesisch',
    'en': 'englisch',
    'eng': 'englisch',
    'it': 'italienisch',
    'ital': 'italienisch',
    'lat': 'latein',
    'spa': 'spanisch',
    'sport': 'bewegung_sport',
    'turnen': 'bewegung_sport',
    'sportunterricht': 'bewegung_sport',
    'bg': 'bildnerisches_gestalten',
    'zeichnen': 'bildnerisches_gestalten',
    'kunst': 'bildnerisches_gestalten',
    'tg': 'ttg',
    'txg': 'ttg',
    'werken': 'ttg',
    'handarbeit': 'ttg',
    'textiles': 'ttg',
    'technisches': 'ttg',
    'mi': 'medien_informatik',
    'informatik': 'medien_informatik',
    'computer': 'medien_informatik',
    'ict': 'medien_informatik',
    'mu': 'musik',
    'gg': 'rzg',
    'geo': 'rzg',
    'geografie': 'rzg',
    'geographie': 'rzg',
    'gs': 'rzg',
    'geschichte': 'rzg',
    'bio': 'natur_technik',
    'biologie': 'natur_technik',
    'physik': 'natur_technik',
    'chemie': 'natur_technik',
    'naturkunde': 'natur_technik',
    'natur': 'nmg',
    'mensch': 'nmg',
    'umwelt': 'nmg',
    'realien': 'nmg',
    'm&u': 'nmg',
    'mensch und umwelt': 'nmg',
    'religion': 'erg',
    'ethik': 'erg',
    'lebenskunde': 'erg',
    'hauswirtschaft': 'wah',
    'kochen': 'wah',
    'wirtschaft': 'wah',
    'bo': 'berufliche_orientierung',
    'berufswahl': 'berufliche_orientierung',
    'berufswahlvorbereitung': 'berufliche_orientierung'
  };

  // Prüfe auf teilweise Übereinstimmungen
  for (const [key, lp21Id] of Object.entries(fuzzyMappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return PREDEFINED_SUBJECTS.find(s => s.lp21_id === lp21Id);
    }
  }

  return null; // Kein Match gefunden
};

/**
 * Gruppiert Fächer nach Fachbereich für die Anzeige
 */
export const groupSubjectsByFachbereich = (subjects) => {
  const grouped = {};

  for (const subject of subjects) {
    const kategorie = FACHBEREICHE_KATEGORIEN[subject.fachbereich.toUpperCase()] ||
                      { id: subject.fachbereich, name: subject.fachbereich };

    if (!grouped[kategorie.id]) {
      grouped[kategorie.id] = {
        ...kategorie,
        subjects: []
      };
    }
    grouped[kategorie.id].subjects.push(subject);
  }

  return Object.values(grouped);
};
