// src/utils/colorUtils.js
/**
 * Farboperationen Utils
 * =====================
 * - adjustColor: HSL-basierte Farbanpassung
 * - getTextColor: Intelligente Textfarbe basierend auf Hintergrund-Luminanz
 * - hexToRgb: Hex zu RGB Konvertierung (Helper)
 * - rgbToHex: RGB zu Hex Konvertierung (Helper)
 */

/**
 * Passt eine Hex-Farbe an (heller/dunkler)
 * @param {string} color - Hex-Farbe (#RRGGBB)
 * @param {number} amount - Anpassung (-100 bis +100)
 * @returns {string} Angepasste Hex-Farbe
 */
export const adjustColor = (color, amount) => {
  if (!color || typeof color !== 'string' || !color.startsWith('#')) {
    return color || '#3b82f6';
  }
  
  let r = parseInt(color.slice(1, 3), 16) / 255;
  let g = parseInt(color.slice(3, 5), 16) / 255;
  let b = parseInt(color.slice(5, 7), 16) / 255;

  // RGB to HSL
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  // Adjust lightness
  l = Math.max(0, Math.min(1, l + amount / 100));

  // HSL to RGB
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    let p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  // RGB to Hex
  const componentToHex = (c) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

/**
 * Berechnet optimale Textfarbe basierend auf Hintergrund-Luminanz
 * @param {string} bgColor - Hex-Hintergrundfarbe
 * @returns {'black' | 'white'} Optimale Textfarbe
 */
export const getTextColor = (bgColor) => {
  try {
    if (!bgColor || typeof bgColor !== 'string' || !bgColor.startsWith('#')) {
      return 'black'; // Default für ungültige Farben
    }

    // Hex zu RGB konvertieren
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    // Relative Luminanz berechnen (WCAG-konform)
    // Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
    // Mit Gamma-Korrektur für bessere Genauigkeit
    const rgbToLinear = (c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    
    const linearR = rgbToLinear(r);
    const linearG = rgbToLinear(g);
    const linearB = rgbToLinear(b);
    
    const luminance = 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
    
    // WCAG 2.1 Kontrast-Standard: Grenze bei 0.179 für AA
    return luminance > 0.179 ? 'black' : 'white';
    
  } catch (error) {
    console.warn('getTextColor error:', error);
    return 'black'; // Fallback
  }
};

/**
 * Berechnet optimale Textfarbe für einen Hintergrund (unterstützt Hex und lineare Gradients)
 * @param {string} bg - Hintergrund (Hex oder linear-gradient String)
 * @returns {'black' | 'white'} Optimale Textfarbe
 */
export const getTextColorForBackground = (bg) => {
  try {
    let colorToCheck = bg;
    
    if (bg.startsWith('linear-gradient')) {
      // Extrahiere die erste Farbe aus dem Gradient (z.B. #rrggbb)
      const match = bg.match(/linear-gradient\([^,]+,\s*(#[a-fA-F0-9]{6})/i);
      if (match && match[1]) {
        colorToCheck = match[1];
      } else {
        return 'white'; // Fallback bei ungültigem Gradient
      }
    }
    
    return getTextColor(colorToCheck);
  } catch (error) {
    console.warn('getTextColorForBackground error:', error);
    return 'white'; // Sicherer Fallback
  }
};

/**
 * Konvertiert Hex-Farbe zu RGB Objekt
 * @param {string} hex - Hex-Farbe (#RRGGBB oder RRGGBB)
 * @returns {{r: number, g: number, b: number}} RGB Werte (0-255)
 */
export const hexToRgb = (hex) => {
  try {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);
    return { r, g, b };
  } catch (error) {
    console.warn('hexToRgb error:', error);
    return { r: 59, g: 130, b: 246 }; // #3b82f6 Fallback
  }
};

/**
 * Konvertiert RGB zu Hex-Farbe
 * @param {{r: number, g: number, b: number}} rgb - RGB Werte (0-255)
 * @returns {string} Hex-Farbe (#RRGGBB)
 */
export const rgbToHex = (rgb) => {
  try {
    const componentToHex = (c) => {
      const hex = Math.round(c).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${componentToHex(rgb.r)}${componentToHex(rgb.g)}${componentToHex(rgb.b)}`;
  } catch (error) {
    console.warn('rgbToHex error:', error);
    return '#3b82f6';
  }
};

/**
 * Erstellt einen Gradient-String für CSS
 * @param {string} color - Basis-Hex-Farbe
 * @param {number} [darkenAmount=-20] - Abdunkelungsgrad für Ende
 * @param {string} [direction='135deg'] - Gradient-Richtung
 * @returns {string} CSS gradient String
 */
export const createGradient = (color, darkenAmount = -20, direction = '135deg') => {
  try {
    const endColor = adjustColor(color, darkenAmount);
    return `linear-gradient(${direction}, ${color} 0%, ${endColor} 100%)`;
  } catch (error) {
    console.warn('createGradient error:', error);
    return `linear-gradient(${direction}, #3b82f6 0%, #1d4ed8 100%)`;
  }
};

/**
 * Validiert ob eine Farbe ein gültiges Hex-Format hat
 * @param {string} color - Zu prüfende Farbe
 * @returns {boolean} Gültigkeitsstatus
 */
export const isValidHexColor = (color) => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Generiert komplementäre Farbe (für Accessibility)
 * @param {string} color - Basis-Hex-Farbe
 * @returns {string} Komplementäre Hex-Farbe
 */
export const getComplementaryColor = (color) => {
  try {
    const rgb = hexToRgb(color);
    // Einfache Komplementär: 255 - RGB
    const compR = Math.round(255 - rgb.r);
    const compG = Math.round(255 - rgb.g);
    const compB = Math.round(255 - rgb.b);
    return rgbToHex({ r: compR, g: compG, b: compB });
  } catch (error) {
    console.warn('getComplementaryColor error:', error);
    return '#3b82f6';
  }
};

/**
 * NEU: Gibt theme-aware Farbe zurück (passt an light/dark an)
 * @param {string} baseColor - Basis-Hex-Farbe (z.B. '#3b82f6' für blue-600)
 * @param {boolean} isDarkMode - Ob dark mode aktiv ist
 * @param {number} [adjustAmount= -10] - Anpassung für dark mode
 * @returns {string} Theme-angepasste Hex-Farbe
 */
export const getThemeAwareColor = (baseColor, isDarkMode, adjustAmount = -10) => {
  if (!isValidHexColor(baseColor)) {
    return baseColor;
  }
  return isDarkMode ? adjustColor(baseColor, adjustAmount) : baseColor;
};