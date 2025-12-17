// src/utils/colorUtils.js
/**
 * Farboperationen Utils – Finale Version für deinen Stundenplan
 * =============================================================
 * Hauptfeature: createMixedSubjectGradient → der perfekte Allerlei-Look
 */

export const adjustColor = (color, amount) => {
  if (!color || typeof color !== 'string' || !color.startsWith('#')) {
    return color || '#3b82f6';
  }

  let r = parseInt(color.slice(1, 3), 16) / 255;
  let g = parseInt(color.slice(3, 5), 16) / 255;
  let b = parseInt(color.slice(5, 7), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  } else {
    h = s = 0;
  }

  l = Math.max(0, Math.min(1, l + amount / 100));

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
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = c => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const getTextColor = (bgColor) => {
  if (!bgColor?.startsWith('#')) return 'white';
  const hex = bgColor.slice(1);
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const l = 0.2126 * (r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)) +
            0.7152 * (g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)) +
            0.0722 * (b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4));

  return l > 0.179 ? 'black' : 'white';
};

export const getTextColorForBackground = (bg) => {
  const match = bg.match(/#[a-fA-F0-9]{6}/);
  return getTextColor(match ? match[0] : '#64748b');
};

export const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

export const rgbToHex = (rgb) => {
  const toHex = c => {
    const h = Math.round(c).toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

/* Klassischer Gradient für normale Fächer */
export const createGradient = (color, darkenAmount = -20, direction = '135deg') => {
  const end = adjustColor(color, darkenAmount);
  return `linear-gradient(${direction}, ${color} 0%, ${end} 100%)`;
};

/* DER GEWINNER: Chaotischer, aber wunderschöner Allerlei-Gradient */
export const createMixedSubjectGradient = (colors) => {
  // Fallbacks
  if (!colors || colors.length === 0) return createGradient('#3b82f6');
  if (colors.length === 1) return createGradient(colors[0], -25);

  const uniqueColors = [...new Set(colors)];
  const numColors = uniqueColors.length;

  const layers = [];

  // 1. Haupt-Layer: Mehrere leicht gewellte horizontale Bänder
  //    Jede Farbe bekommt ein breites, welliges Band mit sinus-ähnlicher Verschiebung
  uniqueColors.forEach((color, i) => {
    const darkened = adjustColor(color, -18);
    const lighter = adjustColor(color, 10); // Für sanfte Highlights

    // Basis-Position des Bandes (gleichmäßig verteilt)
    const basePos = (i / (numColors - 1)) * 100;

    // Leichte sinusförmige Verschiebung für welligen Effekt
    //    Drei Wellen über die Höhe für natürlichen Fluss
    const wave1 = `radial-gradient(circle at 20% ${basePos + 15}%, ${color} 0%, transparent 40%)`;
    const wave2 = `radial-gradient(circle at 50% ${basePos}%, ${lighter} 0%, transparent 50%)`;
    const wave3 = `radial-gradient(circle at 80% ${basePos - 15}%, ${darkened} 0%, transparent 45%)`;

    layers.push(wave1, wave2, wave3);
  });

  // 2. Sehr sanfter diagonaler Basis-Gradient für Gesamtfluss und Harmonie
  const linearStops = uniqueColors
    .map((color, i) => `${color} ${(i / (numColors - 1)) * 100}%`)
    .join(', ');
  layers.push(`linear-gradient(135deg, ${linearStops})`);

  // 3. Ganz leichte horizontale Wellen durch große, flache elliptische radials
  //    Diese sorgen für den "wässrigen" Schimmer, ohne zu dominieren
  for (let i = 0; i < 3; i++) { // Nur 3 sehr subtile Wellen über alles
    const tintColor = uniqueColors[i % numColors];
    const lightTint = adjustColor(tintColor, 15);

    layers.push(
      `radial-gradient(ellipse 120% 25% at 50% ${(i * 33 + 16).toFixed(1)}%, ` +
      `${lightTint}40 0%, transparent 70%)`
    );
  }

  return layers.join(', ');
};

export const isValidHexColor = (color) => /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);

export const getComplementaryColor = (color) => {
  const rgb = hexToRgb(color);
  return rgbToHex({ r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b });
};

export const getThemeAwareColor = (baseColor, isDarkMode, adjustAmount = -10) => {
  return isDarkMode && isValidHexColor(baseColor)
    ? adjustColor(baseColor, adjustAmount)
    : baseColor;
};