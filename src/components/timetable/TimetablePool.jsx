import { useLayoutEffect, useRef, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import debounce from 'lodash/debounce';
import { createGradient } from '../../utils/colorUtils';

const DraggableItem = ({ id, data, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id, data });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    width: '100%',
    height: '40px',
  };
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="w-full">
      {children}
    </div>
  );
};

const TimetablePool = ({
  availableYearlyLessonsForPool,
  gridRef,
  currentWeek
}) => {
  const poolRef = useRef(null);

  // Dynamische Breite basierend auf längstem Fachnamen
  const poolWidth = useMemo(() => {
    const MIN_WIDTH = 140;
    const MAX_WIDTH = 250;
    const CHAR_WIDTH = 8;
    const PADDING = 60; // für Zahlen wie "(2/3)" und Padding

    let maxLength = 0;
    (availableYearlyLessonsForPool || []).forEach(classData => {
      classData.subjects?.forEach(subject => {
        if (subject.subject?.name?.length > maxLength) {
          maxLength = subject.subject.name.length;
        }
      });
    });

    const calculatedWidth = maxLength * CHAR_WIDTH + PADDING;
    return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, calculatedWidth));
  }, [availableYearlyLessonsForPool]);

  // Synchronisiere Pool-Breite mit CSS-Variable für useTimetableStates
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--pool-width', `${poolWidth}px`);
  }, [poolWidth]);

  useLayoutEffect(() => {

    const update = () => {
      if (!poolRef.current || !gridRef?.current) return;

      const gridRect = gridRef.current.getBoundingClientRect();
      const parentRect = poolRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const abstand = 16;

      // Position berechnen
      const topOffset = gridRect.top - parentRect.top;
      let leftOffset = gridRect.right - parentRect.left + abstand;

      // Viewport-Schutz: Nicht über rechten Rand hinaus
      const maxLeft = parentRect.width - poolWidth - 16;
      if (leftOffset > maxLeft) {
        leftOffset = maxLeft;
      }

      poolRef.current.style.position = 'absolute';
      poolRef.current.style.top = `${topOffset}px`;
      poolRef.current.style.left = `${leftOffset}px`;
      poolRef.current.style.zIndex = '10';
    };

    update();

    // Debounced Handler für Window-Resize
    const resizeHandler = debounce(() => requestAnimationFrame(update), 100);
    window.addEventListener('resize', resizeHandler);

    // ResizeObserver für Grid-Größenänderungen (z.B. bei Einstellungsänderungen)
    let resizeObserver = null;
    if (gridRef?.current) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(update);
      });
      resizeObserver.observe(gridRef.current);
    }

    return () => {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler.cancel();
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [gridRef, currentWeek, poolWidth]);

  const hasAnySubjects = availableYearlyLessonsForPool.some(cg => cg.subjects.length > 0);

  return (
    <div ref={poolRef} className="timetable-pool-container p-4 shadow-md rounded-2xl overflow-y-auto overflow-x-hidden"
         style={{ width: `${poolWidth}px`, maxHeight: '80vh' }}>
      <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Stundenpool</h3>
      <div className="flex flex-col gap-4">
        {hasAnySubjects ? (
          availableYearlyLessonsForPool.map((classGroup) => (
            <div key={classGroup.classData.id}>
              {/* Klassen-Überschrift */}
              <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2 px-1 border-b border-slate-200 dark:border-slate-600 pb-1">
                {classGroup.classData.name}
              </div>
              {/* Fächer der Klasse */}
              <div className="flex flex-col gap-1">
                {classGroup.subjects.map((subjectData) => {
                  const subjectColor = subjectData.subject.color || '#3b82f6';
                  const hasHalfClassPending = subjectData.availableLessons.some(yl =>
                    yl.is_half_class &&
                    (subjectData.lessons || []).filter(l =>
                      l.yearly_lesson_id === yl.id &&
                      l.week_number === currentWeek &&
                      !l.is_hidden
                    ).length === 1
                  );

                  return (
                    <DraggableItem
                      key={`pool-${subjectData.subject.id}`}
                      id={`pool-${subjectData.subject.id}`}
                      data={{ type: 'pool', subject: subjectData.subject }}
                    >
                      <div
                        className={`pool-item w-full rounded cursor-grab active:cursor-grabbing flex items-center justify-between ${hasHalfClassPending ? 'pulse-border' : ''}`}
                        style={{ background: createGradient(subjectColor, -20, '135deg'), height: '40px', padding: '0 0.5rem' }}
                      >
                        <div className="font-bold text-white text-sm">{subjectData.subject.name}</div>
                        <span className="text-xs text-white">({subjectData.totalScheduled}/{subjectData.lessonsPerWeek})</span>
                      </div>
                    </DraggableItem>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-2 text-sm">
            Alle Lektionen dieser Woche sind geplant.
          </p>
        )}
      </div>
    </div>
  );
};

export default TimetablePool;