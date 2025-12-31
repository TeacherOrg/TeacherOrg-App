import { useState, useCallback } from 'react';
import { generateId } from '../utils';

/**
 * Custom hook for managing lesson steps (primary and secondary).
 * Used by both yearly and timetable LessonModals.
 *
 * @returns {Object} Step management state and handlers
 */
export const useStepManagement = () => {
  const [primarySteps, setPrimarySteps] = useState([]);
  const [secondSteps, setSecondSteps] = useState([]);

  // Primary step handlers
  const handleAddPrimaryStep = useCallback(() => {
    setPrimarySteps(prev => [...prev, {
      id: generateId(),
      time: null,
      workForm: '',
      activity: '',
      material: ''
    }]);
  }, []);

  const handleRemovePrimaryStep = useCallback((id) => {
    setPrimarySteps(prev => prev.filter(step => step.id !== id));
  }, []);

  const handleUpdatePrimaryStep = useCallback((id, field, value) => {
    setPrimarySteps(prev => prev.map(step =>
      step.id === id ? { ...step, [field]: value } : step
    ));
  }, []);

  // Secondary step handlers (for double lessons)
  const handleAddSecondStep = useCallback(() => {
    setSecondSteps(prev => [...prev, {
      id: `second-${generateId()}`,
      time: null,
      workForm: '',
      activity: '',
      material: ''
    }]);
  }, []);

  const handleRemoveSecondStep = useCallback((id) => {
    setSecondSteps(prev => prev.filter(step => step.id !== id));
  }, []);

  const handleUpdateSecondStep = useCallback((id, field, value) => {
    setSecondSteps(prev => prev.map(step =>
      step.id === id ? { ...step, [field]: value } : step
    ));
  }, []);

  // Bulk operations
  const initializePrimarySteps = useCallback((steps) => {
    setPrimarySteps((steps || []).map(step => ({
      ...step,
      id: step.id || generateId()
    })));
  }, []);

  const initializeSecondSteps = useCallback((steps) => {
    setSecondSteps((steps || []).map(step => ({
      ...step,
      id: step.id?.startsWith('second-') ? step.id : `second-${step.id || generateId()}`
    })));
  }, []);

  const clearSecondSteps = useCallback(() => {
    setSecondSteps([]);
  }, []);

  const mergeSecondIntoPrimary = useCallback(() => {
    setPrimarySteps(prev => [...prev, ...secondSteps.map(s => ({ ...s, id: generateId() }))]);
    setSecondSteps([]);
  }, [secondSteps]);

  const appendToPrimarySteps = useCallback((newSteps) => {
    const withNewIds = newSteps.map(s => ({ ...s, id: generateId() }));
    setPrimarySteps(prev => [...prev, ...withNewIds]);
  }, []);

  const appendToSecondSteps = useCallback((newSteps) => {
    const withNewIds = newSteps.map(s => ({ ...s, id: `second-${generateId()}` }));
    setSecondSteps(prev => [...prev, ...withNewIds]);
  }, []);

  return {
    // State
    primarySteps,
    secondSteps,

    // Setters (for direct manipulation when needed)
    setPrimarySteps,
    setSecondSteps,

    // Primary step handlers
    handleAddPrimaryStep,
    handleRemovePrimaryStep,
    handleUpdatePrimaryStep,

    // Secondary step handlers
    handleAddSecondStep,
    handleRemoveSecondStep,
    handleUpdateSecondStep,

    // Bulk operations
    initializePrimarySteps,
    initializeSecondSteps,
    clearSecondSteps,
    mergeSecondIntoPrimary,
    appendToPrimarySteps,
    appendToSecondSteps
  };
};

export default useStepManagement;
