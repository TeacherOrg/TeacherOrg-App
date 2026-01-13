/**
 * Automatische Display-Skalierungs-Utility
 * Erkennt 4K-Klassenzimmer-Displays und wendet intelligente Skalierung an
 */

export const SCALING_PRESETS = {
  desktop: { minWidth: 0, maxWidth: 2559, scale: 1, label: 'Desktop (1080p)' },
  '1440p': { minWidth: 2560, maxWidth: 3839, scale: 1.25, label: '1440p/2K' },
  '4k': { minWidth: 3840, maxWidth: 5119, scale: 2, label: '4K UHD' },
  '5k': { minWidth: 5120, maxWidth: 9999, scale: 2.5, label: '5K+' },
};

/**
 * Erkennt große Klassenzimmer-Displays (65"+)
 * Heuristik: 4K+ Auflösung mit niedrigem devicePixelRatio (Standard-DPI)
 */
export function isLargeClassroomDisplay() {
  const width = window.screen.width;
  const pixelRatio = window.devicePixelRatio || 1;

  // Große Displays haben typischerweise pixelRatio = 1 (nicht Retina)
  const isLowDPI = pixelRatio <= 1.25;
  const is4KOrHigher = width >= 3840;

  return is4KOrHigher && isLowDPI;
}

/**
 * Berechnet optimalen Skalierungsfaktor basierend auf Bildschirmgröße
 * Berücksichtigt auch Ultra-Wide-Monitore
 */
export function calculateScaleFactor() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;

  // Ultra-Wide-Erkennung (> 2:1 Seitenverhältnis)
  if (aspectRatio > 2.0) {
    if (width >= 5120) return 1.5; // Super Ultra-Wide
    if (width >= 3440) return 1.25; // Standard Ultra-Wide
  }

  // Standard-Erkennung basierend auf Breite
  for (const preset of Object.values(SCALING_PRESETS)) {
    if (width >= preset.minWidth && width <= preset.maxWidth) {
      return preset.scale;
    }
  }

  return 1; // Fallback
}

/**
 * Wendet Skalierung auf CSS-Root-Variablen an
 * @param {number} scale - Skalierungsfaktor (1, 1.25, 2, etc.)
 * @param {boolean} userOverride - Wenn true, wird in localStorage gespeichert
 */
export function applyDisplayScaling(scale = null, userOverride = false) {
  const scaleFactor = scale !== null ? scale : calculateScaleFactor();

  // Setze CSS-Variable
  document.documentElement.style.setProperty('--scale-factor', scaleFactor);

  // Aktualisiere Zellendimensionen (Basis * Skalierung)
  const baseCellWidth = 120;
  const baseCellHeight = 80;

  document.documentElement.style.setProperty(
    '--cell-width',
    `${baseCellWidth * scaleFactor}px`
  );
  document.documentElement.style.setProperty(
    '--cell-height',
    `${baseCellHeight * scaleFactor}px`
  );

  // Bei Nutzer-Override: In localStorage speichern
  if (userOverride) {
    localStorage.setItem('displayScaleFactor', scaleFactor.toString());
    localStorage.setItem('displayScalingUserSet', 'true');
  }

  // Event für Komponenten dispatchen
  window.dispatchEvent(new CustomEvent('display-scale-changed', {
    detail: { scale: scaleFactor, userOverride }
  }));

  console.log(`[Display Scaling] Applied ${scaleFactor}x scaling`);
}

/**
 * Initialisiert automatische Skalierung beim App-Start
 */
export function initializeDisplayScaling() {
  // Prüfe auf Nutzer-Override
  const userScale = localStorage.getItem('displayScaleFactor');
  const isUserSet = localStorage.getItem('displayScalingUserSet') === 'true';

  if (isUserSet && userScale) {
    // Nutzer-Präferenz verwenden
    applyDisplayScaling(parseFloat(userScale), false);
    console.log(`[Display Scaling] Using user preference: ${userScale}x`);
  } else {
    // Automatische Erkennung
    const autoScale = calculateScaleFactor();
    applyDisplayScaling(autoScale, false);

    if (isLargeClassroomDisplay()) {
      console.log(`[Display Scaling] ✅ Large classroom display detected (${autoScale}x)`);
    } else {
      console.log(`[Display Scaling] Auto-scaling: ${autoScale}x`);
    }
  }

  // Bei Fenster-Resize neu berechnen (debounced)
  let resizeTimeout;
  let lastPixelRatio = window.devicePixelRatio;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const currentPixelRatio = window.devicePixelRatio;

      // Wenn devicePixelRatio sich ändert → Nutzer hat gezoomt, nicht neu skalieren
      if (currentPixelRatio !== lastPixelRatio) {
        console.log('[Display Scaling] User zoom detected, preserving setting');
        lastPixelRatio = currentPixelRatio;
        return;
      }

      // Nur neu skalieren wenn nicht vom Nutzer gesetzt
      const isUserSet = localStorage.getItem('displayScalingUserSet') === 'true';
      if (!isUserSet) {
        const newScale = calculateScaleFactor();
        applyDisplayScaling(newScale, false);
      }
    }, 300);
  });
}

/**
 * Setzt Skalierung auf automatisch zurück (löscht Nutzer-Override)
 */
export function resetDisplayScaling() {
  localStorage.removeItem('displayScaleFactor');
  localStorage.removeItem('displayScalingUserSet');
  const autoScale = calculateScaleFactor();
  applyDisplayScaling(autoScale, false);
}
