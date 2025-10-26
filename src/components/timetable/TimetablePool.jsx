import React, { useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';

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

const TimetablePool = ({ classes, activeClassId, setActiveClassId, availableYearlyLessonsForPool, subjects, gridRef }) => { // Füge gridRef als Prop hinzu
  const poolRef = useRef(null);

  useEffect(() => {
    const updatePoolPositionWidthAndHeight = () => {
      if (poolRef.current && gridRef?.current) {
        // Position berechnen
        const gridRect = gridRef.current.getBoundingClientRect();
        const abstand = 16; // 1rem = 16px
        poolRef.current.style.position = 'absolute';
        poolRef.current.style.top = '0px';
        poolRef.current.style.left = `${gridRect.right + abstand}px`;

        // Breite berechnen (unverändert)
        const items = poolRef.current.querySelectorAll('.pool-item');
        let maxWidth = 200;
        items.forEach(item => {
          const originalStyles = {
            whiteSpace: item.style.whiteSpace,
            overflow: item.style.overflow,
            textOverflow: item.style.textOverflow,
          };
          item.style.whiteSpace = 'nowrap';
          item.style.overflow = 'visible';
          item.style.textOverflow = 'clip';
          const width = item.getBoundingClientRect().width;
          item.style.whiteSpace = originalStyles.whiteSpace;
          item.style.overflow = originalStyles.overflow;
          item.style.textOverflow = originalStyles.textOverflow;
          maxWidth = Math.max(maxWidth, width + 60);
        });
        document.documentElement.style.setProperty('--pool-width', `${maxWidth}px`);

        // Höhe berechnen (deine aktuelle Version, die fast perfekt ist)
        const numItems = availableYearlyLessonsForPool.length;
        const itemHeight = 40;
        const headerHeight = 40;
        const padding = 24;
        const poolContentHeight = numItems * itemHeight + headerHeight + padding;
        document.documentElement.style.setProperty('--pool-height', `${poolContentHeight}px`);
      }
    };

    updatePoolPositionWidthAndHeight();
    window.addEventListener('resize', updatePoolPositionWidthAndHeight);
    return () => window.removeEventListener('resize', updatePoolPositionWidthAndHeight);
  }, [availableYearlyLessonsForPool, gridRef]);

  return (
    <div
      ref={poolRef}
      className="timetable-pool-container p-4 shadow-md rounded-2xl overflow-y-hidden ml-4"
      style={{ width: 'var(--pool-width, 150px)', height: 'var(--pool-height, auto)' }}
    >
      <h3 className="text-lg font-semibold mb-2">Stundenpool</h3>
      {classes.length > 0 && (
        <select
          value={activeClassId || ''}
          onChange={e => setActiveClassId(e.target.value)}
          className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white text-sm mb-2"
        >
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      )}
      <div className="flex flex-col gap-1">
        {availableYearlyLessonsForPool.length > 0 ? (
          availableYearlyLessonsForPool.map((subjectData) => {
            const subjectColor = subjectData.subject.color || '#3b82f6';
            return (
              <DraggableItem key={`pool-${subjectData.subject.id}`} id={`pool-${subjectData.subject.id}`} data={{ type: 'pool', subject: subjectData.subject }}>
                <div
                  className="pool-item w-full rounded cursor-grab active:cursor-grabbing flex items-center justify-between"
                  style={{ backgroundColor: subjectColor, height: '40px', padding: '0 0.5rem' }}
                >
                  <div className="font-bold text-white">
                    {subjectData.subject.name}
                  </div>
                  <span className="text-sm text-white">
                    ({subjectData.totalScheduled}/{subjectData.lessonsPerWeek})
                  </span>
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