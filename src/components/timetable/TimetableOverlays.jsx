import React, { useEffect } from 'react';
import debounce from 'lodash/debounce';
import OverlayView from "./OverlayView";
import { DragOverlay } from '@dnd-kit/core';

const TimetableOverlays = ({
  hoverLesson, hoverPosition, setHoverLesson,
  debouncedShowRef, debouncedHideRef, disableHover,
  activeDragId, lessonsWithDetails, renderDragOverlay,
  setHoverPosition, // Add setHoverPosition to props
  overlayRef // Add overlayRef to props
}) => {
  useEffect(() => {
    debouncedShowRef.current = debounce((lesson, position) => {
      if (debouncedHideRef.current) debouncedHideRef.current.cancel();
      setHoverLesson(lesson);
      setHoverPosition(position); // Use setHoverPosition instead of hoverPosition
    }, 150, { leading: true, trailing: true });
    debouncedHideRef.current = debounce(() => {
      if (debouncedShowRef.current) debouncedShowRef.current.cancel();
      setHoverLesson(null);
    }, 150, { leading: false, trailing: true });
    return () => {
      if (debouncedShowRef.current) debouncedShowRef.current.cancel();
      if (debouncedHideRef.current) debouncedHideRef.current.cancel();
    };
  }, [setHoverLesson, setHoverPosition]); // Add dependencies

  return (
    <>
      {hoverLesson && (
        <OverlayView
          ref={overlayRef} // Pass overlayRef correctly
          lesson={hoverLesson}
          onMouseEnter={() => { if (debouncedShowRef.current) debouncedShowRef.current(hoverLesson, hoverPosition); }}
          onMouseLeave={() => { if (debouncedHideRef.current) debouncedHideRef.current(); }}
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