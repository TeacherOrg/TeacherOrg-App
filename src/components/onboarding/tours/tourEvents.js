// Event names for interactive tour
export const TOUR_EVENTS = {
  TOPIC_MODAL_OPENED: 'topic-modal-opened',
  TOPIC_CREATED: 'topic-created',
  LESSON_MODAL_OPENED: 'lesson-modal-opened',
  LESSON_SAVED: 'lesson-saved',
  LESSONS_PLACED_ADJACENT: 'lessons-placed-adjacent',
  DOUBLE_LESSON_CREATED: 'double-lesson-created',
  DOUBLE_LESSON_PLACED: 'double-lesson-placed'
};

/**
 * Dispatches a custom tour event
 * @param {string} eventName - The name of the event (from TOUR_EVENTS)
 * @param {Object} data - Additional data to pass with the event
 */
export const emitTourEvent = (eventName, data = {}) => {
  window.dispatchEvent(new CustomEvent('tour-event', {
    detail: { event: eventName, data }
  }));
  console.log('[Tour] Event emitted:', eventName, data);
};

/**
 * Listens for a specific tour event
 * @param {string} eventName - The name of the event to listen for
 * @param {Function} callback - Callback function to execute when event occurs
 * @returns {Function} Cleanup function to remove the event listener
 */
export const listenForTourEvent = (eventName, callback) => {
  const handler = (e) => {
    if (e.detail.event === eventName) {
      callback(e.detail.data);
    }
  };
  window.addEventListener('tour-event', handler);
  return () => window.removeEventListener('tour-event', handler);
};
