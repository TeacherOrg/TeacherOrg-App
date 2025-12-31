// src/components/topics/hooks/useMaterialManagement.js
import { useState, useCallback, useMemo } from 'react';

/**
 * Standard-Materialien, die häufig verwendet werden
 */
export const COMMON_MATERIALS = [
  "Dossier",
  "Arbeitsheft",
  "Schreibheft",
  "Buch",
  "Zirkel",
  "Geodreieck",
  "Taschenrechner",
  "Lineal",
  "IPad",
  "Laptop",
  "Heft",
  "Stift",
  "Farben",
  "Schere"
];

/**
 * Hook für das Material-Management in TopicModal.
 *
 * @param {Array} initialMaterials - Bereits ausgewählte Materialien
 * @returns {Object} - Material-State und Hilfsfunktionen
 */
export function useMaterialManagement(initialMaterials = []) {
  // Initiale Aufteilung in Common und Custom
  const [selectedCommon, setSelectedCommon] = useState(() =>
    initialMaterials.filter(m => COMMON_MATERIALS.includes(m))
  );

  const [customMaterials, setCustomMaterials] = useState(() =>
    initialMaterials.filter(m => !COMMON_MATERIALS.includes(m))
  );

  const [newMaterialName, setNewMaterialName] = useState("");

  /**
   * Kombinierte Liste aller ausgewählten Materialien
   */
  const allMaterials = useMemo(() =>
    [...selectedCommon, ...customMaterials],
    [selectedCommon, customMaterials]
  );

  /**
   * Toggelt die Auswahl eines Standard-Materials
   */
  const toggleCommonMaterial = useCallback((material) => {
    setSelectedCommon(prev =>
      prev.includes(material)
        ? prev.filter(m => m !== material)
        : [...prev, material]
    );
  }, []);

  /**
   * Prüft, ob ein Material ausgewählt ist
   */
  const isMaterialSelected = useCallback((material) => {
    return selectedCommon.includes(material);
  }, [selectedCommon]);

  /**
   * Fügt ein neues benutzerdefiniertes Material hinzu
   */
  const addCustomMaterial = useCallback(() => {
    const trimmed = newMaterialName.trim();

    if (!trimmed) {
      return { success: false, error: 'Name darf nicht leer sein' };
    }

    if (allMaterials.includes(trimmed)) {
      return { success: false, error: 'Material existiert bereits' };
    }

    if (COMMON_MATERIALS.includes(trimmed)) {
      // Wenn es ein Standard-Material ist, aktiviere es stattdessen
      if (!selectedCommon.includes(trimmed)) {
        setSelectedCommon(prev => [...prev, trimmed]);
      }
      setNewMaterialName("");
      return { success: true, wasCommon: true };
    }

    setCustomMaterials(prev => [...prev, trimmed]);
    setNewMaterialName("");
    return { success: true };
  }, [newMaterialName, allMaterials, selectedCommon]);

  /**
   * Entfernt ein benutzerdefiniertes Material
   */
  const removeCustomMaterial = useCallback((index) => {
    setCustomMaterials(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Entfernt ein Material nach Namen
   */
  const removeMaterialByName = useCallback((name) => {
    if (COMMON_MATERIALS.includes(name)) {
      setSelectedCommon(prev => prev.filter(m => m !== name));
    } else {
      setCustomMaterials(prev => prev.filter(m => m !== name));
    }
  }, []);

  /**
   * Initialisiert die Materialien mit neuen Werten
   */
  const initializeMaterials = useCallback((materials = []) => {
    setSelectedCommon(materials.filter(m => COMMON_MATERIALS.includes(m)));
    setCustomMaterials(materials.filter(m => !COMMON_MATERIALS.includes(m)));
  }, []);

  /**
   * Setzt alle Materialien zurück
   */
  const reset = useCallback(() => {
    setSelectedCommon([]);
    setCustomMaterials([]);
    setNewMaterialName("");
  }, []);

  /**
   * Wählt alle Standard-Materialien aus
   */
  const selectAllCommon = useCallback(() => {
    setSelectedCommon([...COMMON_MATERIALS]);
  }, []);

  /**
   * Deselektiert alle Standard-Materialien
   */
  const deselectAllCommon = useCallback(() => {
    setSelectedCommon([]);
  }, []);

  return {
    // Constants
    COMMON_MATERIALS,

    // State
    selectedCommon,
    customMaterials,
    allMaterials,
    newMaterialName,

    // Setters
    setNewMaterialName,
    setSelectedCommon,
    setCustomMaterials,

    // Actions
    toggleCommonMaterial,
    isMaterialSelected,
    addCustomMaterial,
    removeCustomMaterial,
    removeMaterialByName,
    initializeMaterials,
    reset,
    selectAllCommon,
    deselectAllCommon
  };
}

export default useMaterialManagement;
