/**
 * Work Form Utilities
 * Mapping von Arbeitsformen zu Emoji-Icons
 */

export const WORK_FORMS = {
    'single': '\u{1F464}',      // 👤
    'einzel': '\u{1F464}',      // 👤
    'partner': '\u{1F465}',     // 👥
    'partnerarbeit': '\u{1F465}', // 👥
    'group': '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}', // 👨‍👩‍👧‍👦
    'gruppe': '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}', // 👨‍👩‍👧‍👦
    'gruppenarbeit': '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}', // 👨‍👩‍👧‍👦
    'plenum': '\u{1F3DB}\uFE0F', // 🏛️
    'frontal': '\u{1F5E3}\uFE0F', // 🗣️
    'discussion': '\u{1F4AC}',   // 💬
    'diskussion': '\u{1F4AC}',   // 💬
    'experiment': '\u{1F9EA}'    // 🧪
};

/**
 * Gibt das passende Icon für eine Arbeitsform zurück
 * @param {string} workForm - Name der Arbeitsform
 * @returns {string} Emoji oder Original-String als Fallback
 */
export function getWorkFormIcon(workForm) {
    if (!workForm) return '';
    const normalized = workForm.toLowerCase().trim();
    return WORK_FORMS[normalized] || workForm;
}
