import React from 'react';
import OverlayView from "./OverlayView";

const TimetableOverlays = ({
  hoverLesson, hoverPosition,
  overlayRef
}) => {
  // DragOverlay is rendered directly in Timetable.jsx inside DndContext
  // This component only handles the hover overlay
  if (!hoverLesson) return null;

  return (
    <OverlayView
      ref={overlayRef}
      lesson={hoverLesson}
      position={hoverPosition}
      subjectColor={hoverLesson.color}
    />
  );
};

export default TimetableOverlays;