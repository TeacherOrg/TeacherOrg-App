// src/components/lesson-planning/utils.js

/**
 * Generiert eine zufällige ID (für temporäre Steps, etc.)
 * Länge 9 Zeichen, alphanumerisch
 */
export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Optional: Weitere Helfer, die du später brauchst, z. B.
 * export const cleanStepsData = (steps) => { ... }
 */