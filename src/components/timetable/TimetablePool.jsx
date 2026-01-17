import { useLayoutEffect, useRef, useMemo, useState, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import debounce from 'lodash/debounce';
import { createGradient } from '../../utils/colorUtils';
import { LessonBadge } from '@/components/shared/lesson';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const DraggableItem = ({ id, data, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id, data });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    width: '100%',
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
  currentWeek,
  topics = []
}) => {
  const poolRef = useRef(null);

  // Dynamische Breite basierend auf längstem Fachnamen
  const poolWidth = useMemo(() => {
    const MIN_WIDTH = 220;
    const MAX_WIDTH = 320;
    const CHAR_WIDTH = 8;
    const PADDING = 80; // für Zahlen wie "(2/3)", Badges und Padding

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

  const hasAnySubjects = availableYearlyLessonsForPool.some(cg =>
    cg.subjects.some(s => s.availableLessons.length > 0)
  );

  // State für "Erledigt"-Animation
  const [showCompleted, setShowCompleted] = useState(false);
  const prevHasSubjects = useRef(hasAnySubjects);
  const prevWeek = useRef(currentWeek);

  useEffect(() => {
    // Bei Wochenwechsel: Kein "Erledigt" zeigen, nur verstecken
    if (prevWeek.current !== currentWeek) {
      setShowCompleted(false);
      prevWeek.current = currentWeek;
      prevHasSubjects.current = hasAnySubjects;
      return;
    }

    // Nur innerhalb derselben Woche: "Erledigt" zeigen wenn letzte Lektion platziert
    if (prevHasSubjects.current && !hasAnySubjects) {
      setShowCompleted(true);
      const timer = setTimeout(() => setShowCompleted(false), 800);
      return () => clearTimeout(timer);
    }

    prevHasSubjects.current = hasAnySubjects;
  }, [hasAnySubjects, currentWeek]);

  // Pool komplett ausblenden wenn leer und Animation vorbei
  if (!hasAnySubjects && !showCompleted) return null;

  // "Erledigt"-Anzeige mit Verpuffen-Animation
  if (showCompleted) {
    return (
      <motion.div
        ref={poolRef}
        className="timetable-pool-container p-4 shadow-md rounded-2xl"
        style={{ width: `${poolWidth}px` }}
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="flex flex-col items-center justify-center py-6">
          <CheckCircle className="w-10 h-10 text-green-500 mb-1" />
          <span className="text-green-600 dark:text-green-400 font-semibold text-sm">Alles geplant!</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div ref={poolRef} className="timetable-pool-container p-4 shadow-md rounded-2xl overflow-y-auto overflow-x-hidden"
         style={{ width: `${poolWidth}px`, maxHeight: '80vh' }}>
      <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Stundenpool</h3>
      <div className="flex flex-col gap-4">
        {availableYearlyLessonsForPool.map((classGroup) => (
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

                // Erste verfügbare Lektion und deren Thema ermitteln
                const firstAvailable = subjectData.availableLessons[0];
                const topic = firstAvailable?.topic_id
                  ? topics.find(t => t.id === firstAvailable.topic_id)
                  : null;
                const displayText = topic?.title || firstAvailable?.name || null;

                return (
                  <DraggableItem
                    key={`pool-${subjectData.subject.id}`}
                    id={`pool-${subjectData.subject.id}`}
                    data={{ type: 'pool', subject: subjectData.subject }}
                  >
                    <div
                      className={`pool-item w-full rounded cursor-grab active:cursor-grabbing flex flex-col justify-center ${hasHalfClassPending ? 'pulse-border' : ''}`}
                      style={{ background: createGradient(subjectColor, -20, '135deg'), padding: '0.5rem', minHeight: '52px' }}
                    >
                      <div className="flex items-center">
                        {firstAvailable?.is_half_class && <LessonBadge variant="half-class" position="inline" className="mr-1" />}
                        <div className="font-bold text-white text-sm truncate">{subjectData.subject.name}</div>
                        <span className="text-xs text-white flex-shrink-0 ml-2">({subjectData.totalScheduled}/{subjectData.lessonsPerWeek})</span>
                        {firstAvailable?.is_exam && <LessonBadge variant="exam" position="inline" className="ml-1" />}
                      </div>
                      {displayText && (
                        <div className="text-xs text-white/75 truncate leading-tight mt-0.5">{displayText}</div>
                      )}
                    </div>
                  </DraggableItem>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimetablePool;