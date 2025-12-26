import React from 'react';
import { createGradient } from '@/utils/colorUtils';import { normalizeAllerleiData, calculateAllerleiGradient } from '@/components/timetable/allerlei/AllerleiUtils';

const LessonCard = ({ lesson, isDragging, onMouseEnter, onMouseLeave, onMouseMove, subjects = [], isAltPressed, isSelectingMerge, mergePreview }) => {
  if (!lesson) return null;

  const {
    expand,
    description,
    topic,
    color,
    is_exam,
    is_allerlei,
    allerlei_subjects,
    is_half_class,
    isGradient,
    subject_name, // Use subject_name from normalized data
    subject, // Use subject ID for fallback
  } = lesson;

  // Determine subject name with fallbacks
  const subjectName = expand?.subject?.name || subject_name || subjects.find(s => s.id === subject)?.name || 'Unbekannt';

  // Gradient für normale Lektionen und Allerlei-Lektionen
  const cardStyle = {
    background: lesson.isGradient && lesson.color
    ? lesson.color
    : createGradient(lesson.color || '#3b82f6', -20, '135deg'),
  };

  return (
    <div
      className={`
        w-full h-full rounded-lg p-2 cursor-pointer transition-all duration-150
        shadow-md hover:shadow-lg text-white text-center flex flex-col justify-center relative
        ${isDragging ? 'opacity-90 shadow-2xl scale-105 -rotate-2' : ''}
        ${isAltPressed ? 'ring-4 ring-purple-400/50 shadow-xl transition-all' : ''}
        ${isAltPressed && !isSelectingMerge ? 'ring-4 ring-purple-500/60 scale-105 shadow-2xl' : ''}
      `}
      style={cardStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {is_half_class && (
        <div className="absolute top-1 left-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          1/2
        </div>
      )}
      {is_exam && (
        <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          ❗
        </div>
      )}
      <div className={`font-bold text-sm ${is_allerlei ? 'mb-1' : ''}`}>
        {is_allerlei ? (
          'Allerlei'
        ) : (
          <div>
            <div>{subjectName}</div> {/* Display subject name first */}
            <div className="text-xs opacity-75">
              {topic?.title || lesson?.primaryYearlyLesson?.name || ( // Prioritize topic title, then lesson name
                lesson?.is_double_lesson && lesson?.second_yearly_lesson_id && lesson?.secondYearlyLesson ? (
                  `${lesson?.primaryYearlyLesson?.name || `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}`} + ${lesson?.secondYearlyLesson?.name || `Lektion ${Number(lesson?.primaryYearlyLesson?.lesson_number || 1) + 1}`}`
                ) : (
                  `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}` || 'Primäre (fehlt)'
                )
              )}
            </div>
          </div>
        )}
      </div>
      {is_allerlei && (
        <div className="text-[10px] opacity-80 leading-tight">
          {allerlei_subjects.join(' | ')}
        </div>
      )}
    </div>
  );
};

export default LessonCard;