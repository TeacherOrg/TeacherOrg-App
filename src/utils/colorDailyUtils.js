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

// Definiere Themen
export const DAILY_THEMES = {
  default: {
    primary: '#3b82f6', // Blau
    secondary: '#64748b', // Grau
    accent: '#94a3b8', // Hellgrau
    gradientDirection: 'to-br',
    glowIntensity: 0.4,
    dark: {  // Neue Sub-Objekte für Dark-Mode
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#cbd5e1',
    }
  },
  spring: {
    primary: '#6ee7b7', // Mintgrün
    secondary: '#fb7185', // Koralle
    accent: '#c4b5fd', // Lavendel
    gradientDirection: 'to-r',
    glowIntensity: 0.5,
    dark: {
      primary: '#34d399',
      secondary: '#f43f5e',
      accent: '#a78bfa',
    }
  },
  energy: {
    primary: '#3b82f6', // Neonblau
    secondary: '#d946ef', // Magenta
    accent: '#84cc16', // Limette
    gradientDirection: 'to-tr',
    glowIntensity: 0.7,
    dark: {
      primary: '#60a5fa',
      secondary: '#e879f9',
      accent: '#a3e635',
    }
  },
  minimal: {
    primary: '#64748b', // Grau
    secondary: '#94a3b8', // Hellgrau
    accent: '#e5e7eb', // Sehr helles Grau
    gradientDirection: 'to-b',
    glowIntensity: 0.3,
    dark: {
      primary: '#94a3b8',
      secondary: '#cbd5e1',
      accent: '#e5e7eb',
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