/**
 * Farboperationen Utils für DailyView
 * ==================================
 * Erweitert colorUtils.js mit Themen-spezifischen Funktionen.
 * - getThemeGradient: Themenbasierter Gradient
 * - getGlowColor: Glow-Effekt für Hover
 * - getThemeTextColor: Themenoptimierte Textfarbe
 * - isValidTheme: Validierung von Themen
 */

// Importiere bestehende Funktionen aus colorUtils
import { adjustColor, getTextColor, createGradient, isValidHexColor, getComplementaryColor } from './colorUtils';

// Definiere Themen (nur Standard + Weltraum)
export const DAILY_THEMES = {
  default: {
    primary: '#3b82f6', // Blau
    secondary: '#64748b', // Grau
    accent: '#94a3b8', // Hellgrau
    gradientDirection: 'to-br',
    glowIntensity: 0.4,
    dark: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#cbd5e1',
    }
  },
  space: {
    primary: '#7c3aed', // Violett (Nebula)
    secondary: '#06b6d4', // Cyan (Sterne)
    accent: '#f472b6', // Pink (Galaxie)
    gradientDirection: 'to-br',
    glowIntensity: 0.6,
    background: 'from-slate-900 via-purple-900 to-slate-900',
    dark: {
      primary: '#8b5cf6',
      secondary: '#22d3ee',
      accent: '#f9a8d4',
    }
  },
};

/**
 * Erstellt einen themenbasierten Gradient-String
 * @param {string} theme - Thema ('spring', 'energy', 'minimal')
 * @param {string} baseColor - Basis-Hex-Farbe
 * @param {number} [darkenAmount=-20] - Abdunkelungsgrad
 * @param {boolean} [isDark=false] - Ob Dark-Mode aktiv ist
 * @returns {string} CSS gradient String
 */
export const getThemeGradient = (theme, baseColor, darkenAmount = -20, isDark = false) => {
  if (!DAILY_THEMES[theme]) {
    console.warn(`Invalid theme: ${theme}. Using default.`);
    return createGradient(baseColor, darkenAmount); // Übernommen aus colorUtils
  }

  const themeConfig = DAILY_THEMES[theme];
  const colors = isDark ? (themeConfig.dark || themeConfig) : themeConfig;
  const adjustedBase = adjustColor(baseColor, darkenAmount);
  const direction = themeConfig.gradientDirection || '135deg'; // Korrekte Direction aus colorUtils
  let gradient = createGradient(colors.primary, darkenAmount, direction); // Nutze createGradient für Verlauf
  gradient += `, ${adjustedBase}30`; // Leichte Anpassung für Transparenz
  
  console.debug(`Generated gradient for theme ${theme}: ${gradient}`);
  return gradient;
};

/**
 * Generiert eine Glow-Farbe für Hover-Effekte
 * @param {string} theme - Thema
 * @param {string} baseColor - Basis-Hex-Farbe
 * @param {number} [intensity] - Glow-Intensität (0-1)
 * @param {boolean} [isDark=false] - Ob Dark-Mode aktiv ist
 * @returns {string} CSS box-shadow String
 */
export const getGlowColor = (theme, baseColor, intensity, isDark = false) => {
  if (!isValidHexColor(baseColor)) {
    console.warn(`Invalid baseColor: ${baseColor}. Using default glow.`);
    return '0 0 10px rgba(59, 130, 246, 0.5)';
  }
  
  const themeConfig = DAILY_THEMES[theme] || DAILY_THEMES.default;
  const colors = isDark ? (themeConfig.dark || themeConfig) : themeConfig;
  const glowColor = colors.accent || adjustColor(baseColor, 20); // Fallback zu heller BaseColor
  const adjustedIntensity = intensity || themeConfig.glowIntensity || 0.5;
  
  const { r, g, b } = hexToRgb(glowColor);
  const glow = `0 0 10px rgba(${r}, ${g}, ${b}, ${adjustedIntensity})`;
  
  // Debugging: Logge den generierten Glow
  console.debug(`Generated glow for theme ${theme}: ${glow}`);
  return glow;
};

/**
 * Berechnet themenoptimierte Textfarbe
 * @param {string} theme - Thema
 * @param {string} bgColor - Hintergrund-Hex
 * @param {boolean} [isDark=false] - Ob Dark-Mode aktiv ist
 * @returns {'black' | 'white' | string} Textfarbe (Hex für Themen)
 */
export const getThemeTextColor = (theme, bgColor, isDark = false) => {
  const baseText = getTextColor(bgColor);
  if (!DAILY_THEMES[theme]) {
    console.warn(`Invalid theme: ${theme}. Using base text color.`);
    return baseText;
  }

  const themeConfig = DAILY_THEMES[theme];
  const colors = isDark ? (themeConfig.dark || themeConfig) : themeConfig;
  const { accent } = colors;
  // Verwende Akzentfarbe, angepasst an Hintergrundkontrast
  const textColor = getTextColor(bgColor) === 'black' ? adjustColor(accent, -50) : adjustColor(accent, 50);
  
  // Debugging: Logge die Textfarbe
  console.debug(`Generated text color for theme ${theme}: ${textColor}`);
  return textColor;
};

/**
 * Validiert ein Thema
 * @param {string} theme - Zu prüfendes Thema
 * @returns {boolean}
 */
export const isValidTheme = (theme) => !!DAILY_THEMES[theme];

// Helper: Hex zu RGB
const hexToRgb = (hex) => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substr(0, 2), 16);
  const g = parseInt(cleanHex.substr(2, 2), 16);
  const b = parseInt(cleanHex.substr(4, 2), 16);
  return { r, g, b };
};