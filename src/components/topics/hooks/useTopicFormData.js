// src/components/topics/hooks/useTopicFormData.js
import { useState, useCallback } from 'react';

/**
 * Hook für das Form-State Management in TopicModal.
 *
 * @param {Object} initialTopic - Das Topic zum Bearbeiten (oder null für neu)
 * @param {string} subjectColor - Standardfarbe des Faches
 * @returns {Object} - Form-State und Hilfsfunktionen
 */
export function useTopicFormData(initialTopic = null, subjectColor = '#3b82f6') {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: subjectColor,
    goals: "",
    department: "",
    lehrplan_kompetenz_ids: []
  });

  /**
   * Aktualisiert ein einzelnes Feld im Formular
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Aktualisiert mehrere Felder gleichzeitig
   */
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Initialisiert das Formular mit Topic-Daten
   */
  const initializeFromTopic = useCallback((topic, defaultColor = subjectColor) => {
    if (topic) {
      setFormData({
        name: topic.name || "",
        description: topic.description || "",
        color: topic.color || defaultColor,
        goals: topic.goals || "",
        department: topic.department || "",
        lehrplan_kompetenz_ids: topic.lehrplan_kompetenz_ids || []
      });
    }
  }, [subjectColor]);

  /**
   * Setzt das Formular auf Standardwerte zurück
   */
  const reset = useCallback((defaultColor = subjectColor) => {
    setFormData({
      name: "",
      description: "",
      color: defaultColor,
      goals: "",
      department: "",
      lehrplan_kompetenz_ids: []
    });
  }, [subjectColor]);

  /**
   * Validiert das Formular
   */
  const validate = useCallback(() => {
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = 'Bitte geben Sie einen Themennamen ein';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [formData]);

  /**
   * Erstellt das Payload-Objekt für das Speichern
   */
  const createPayload = useCallback((topicId, subjectId, classId, selectedCompetencies, materials) => {
    return {
      id: topicId,
      name: formData.name,
      subject: subjectId || '',
      class_id: classId,
      description: formData.description || '',
      color: formData.color || '#3b82f6',
      goals: formData.goals || '',
      department: formData.department || '',
      lehrplan_kompetenz_ids: selectedCompetencies,
      materials: materials || []
    };
  }, [formData]);

  return {
    formData,
    setFormData,
    updateField,
    updateFields,
    initializeFromTopic,
    reset,
    validate,
    createPayload
  };
}

export default useTopicFormData;
