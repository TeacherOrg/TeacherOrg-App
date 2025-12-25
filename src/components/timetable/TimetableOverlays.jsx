import React from 'react';
import OverlayView from "./OverlayView";
import { DragOverlay } from '@dnd-kit/core';

const TimetableOverlays = ({
  hoverLesson, hoverPosition,
  disableHover,
  activeDragId, lessonsWithDetails, renderDragOverlay,
  overlayRef
}) => {

  return (
    <>
      {hoverLesson && (
        <OverlayView
          ref={overlayRef}
          lesson={hoverLesson}
          position={hoverPosition}
          subjectColor={hoverLesson.color}
        />
      )}
      <DragOverlay>
        {activeDragId ? renderDragOverlay(activeDragId) : null}
      </DragOverlay>
    </>
  );
};

export default TimetableOverlays;