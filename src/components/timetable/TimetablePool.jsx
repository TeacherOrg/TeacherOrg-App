import React, { useLayoutEffect, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import debounce from 'lodash/debounce';

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
  classes, 
  activeClassId, 
  setActiveClassId, 
  availableYearlyLessonsForPool, 
  subjects, 
  gridRef,
  currentWeek,
  lessonsForCurrentWeek   // ← NEU: übergeben!
}) => {
  const poolRef = useRef(null);

  useLayoutEffect(() => {
    const update = () => {
      if (!poolRef.current || !gridRef?.current) {
        return;
      }

      const gridRect = gridRef.current.getBoundingClientRect();
      const abstand = 16;

      poolRef.current.style.position = 'absolute';
      poolRef.current.style.top = '16px';
      poolRef.current.style.left = `${gridRect.right + abstand}px`;
      poolRef.current.style.zIndex = '10';

      // --- Breite & Höhe berechnen ---
      let maxWidth = 200;
      const items = poolRef.current.querySelectorAll('.pool-item');
      items.forEach(item => {
        const origStyles = {
          whiteSpace: item.style.whiteSpace,
          overflow: item.style.overflow,
          textOverflow: item.style.textOverflow,
          animation: item.style.animation
        };
        item.style.whiteSpace = 'nowrap';
        item.style.overflow = 'visible';
        item.style.textOverflow = 'clip';
        item.style.animation = 'none';
        const w = item.getBoundingClientRect().width;
        item.style.whiteSpace = origStyles.whiteSpace;
        item.style.overflow = origStyles.overflow;
        item.style.textOverflow = origStyles.textOverflow;
        item.style.animation = origStyles.animation;
        maxWidth = Math.max(maxWidth, w + 60);
      });
      document.documentElement.style.setProperty('--pool-width', `${maxWidth}px`);

      const h = availableYearlyLessonsForPool.length * 40 + 40 + 24;
      document.documentElement.style.setProperty('--pool-height', `${h}px`);

      console.log('Debug: Pool position', {
        container: poolRef.current.parentElement.getBoundingClientRect(),
        gridRight: gridRect.right,
        poolLeft: poolRef.current.style.left,
        poolTop: poolRef.current.style.top,
        viewportWidth: window.innerWidth,
        poolWidth: maxWidth
      });
    };

    update();

    const resizeHandler = debounce(() => requestAnimationFrame(update), 100);
    window.addEventListener('resize', resizeHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler.cancel();
    };
  }, [availableYearlyLessonsForPool, gridRef, currentWeek]);

  return (
    <div ref={poolRef} className="timetable-pool-container p-4 shadow-md rounded-2xl overflow-y-hidden ml-4"
         style={{ width: 'var(--pool-width, 150px)', height: 'var(--pool-height, auto)' }}>
      <h3 className="text-lg font-semibold mb-2">Stundenpool</h3>
      <div className="flex flex-col gap-1">
        {availableYearlyLessonsForPool.length > 0 ? (
          availableYearlyLessonsForPool.map((subjectData) => {
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
              <DraggableItem key={`pool-${subjectData.subject.id}`} id={`pool-${subjectData.subject.id}`} data={{ type: 'pool', subject: subjectData.subject }}>
                <div
                  className={`pool-item w-full rounded cursor-grab active:cursor-grabbing flex items-center justify-between ${hasHalfClassPending ? 'pulse-border' : ''}`}
                  style={{ backgroundColor: subjectColor, height: '40px', padding: '0 0.5rem' }}
                >
                  <div className="font-bold text-white">{subjectData.subject.name}</div>
                  <span className="text-sm text-white">({subjectData.totalScheduled}/{subjectData.lessonsPerWeek})</span>
                </div>
              </DraggableItem>
            );
          })
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-2">
            {activeClassId ? 'Alle Lektionen dieser Woche sind geplant.' : 'Bitte eine Klasse auswählen.'}
          </p>
        )}
      </div>
    </div>
  );
};

export default TimetablePool;