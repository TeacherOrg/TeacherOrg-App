import React from 'react';
import { adjustColor } from '@/utils/colorUtils';

const LessonCard = ({ lesson, isDragging, onEdit, onMouseEnter, onMouseLeave, onMouseMove }) => {
  if (!lesson) return null;

  const {
    expand,  // Neu: Verwende expand für Relations
    description,
    topic,
    color,
    is_exam,
    is_allerlei,
    allerlei_subjects,
    is_half_class,
    isGradient,
  } = lesson;

  const subjectName = expand?.subject?.name || 'Unbekannt';  // Neu: Hole Name aus expand (Fallback, falls nicht geladen)

  const cardStyle = {
    background: isGradient ? color : `linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%)`,
  };

  return (
    <div
      className={`
        w-full h-full rounded-lg p-2 cursor-pointer transition-all duration-150
        shadow-md hover:shadow-lg text-white text-center flex flex-col justify-center relative
        ${isDragging ? 'opacity-90 shadow-2xl scale-105 -rotate-2' : ''}
        ${is_exam ? 'border-2 border-red-500' : ''}
      `}
      style={cardStyle}
      onClick={() => onEdit(lesson)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {is_half_class && (
        <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          1/2
        </div>
      )}
      <div className={`font-bold text-sm ${is_allerlei ? 'mb-1' : ''}`}>
        {console.log('Debug: LessonCard render', {
          lessonId: lesson?.id,
          yearlyLessonId: lesson?.yearly_lesson_id,
          primaryName: lesson?.primaryYearlyLesson?.name,
          primaryLessonNumber: lesson?.primaryYearlyLesson?.lesson_number,
          secondName: lesson?.secondYearlyLesson?.name,
          secondLessonNumber: lesson?.secondYearlyLesson?.lesson_number,
          topicTitle: lesson?.topic?.title
        })}
        {is_allerlei ? (
          'Allerlei'
        ) : lesson?.topic_id && lesson?.topic?.title ? (
          <div>
            <div>{lesson.topic.title}</div>
            <div className="text-xs opacity-75">
              {lesson?.is_double_lesson && lesson?.second_yearly_lesson_id && lesson?.secondYearlyLesson ? (
                `${lesson?.primaryYearlyLesson?.name || `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}`} + ${lesson?.secondYearlyLesson?.name || `Lektion ${Number(lesson?.primaryYearlyLesson?.lesson_number || 1) + 1}`}`
              ) : (
                lesson?.primaryYearlyLesson?.name || `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}` || 'Neue Lektion'
              )}
            </div>
          </div>
        ) : (
          lesson?.is_double_lesson && lesson?.second_yearly_lesson_id && lesson?.secondYearlyLesson ? (
            `${lesson?.primaryYearlyLesson?.name || `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}`} + ${lesson?.secondYearlyLesson?.name || `Lektion ${Number(lesson?.primaryYearlyLesson?.lesson_number || 1) + 1}`}`
          ) : (
            lesson?.primaryYearlyLesson?.name || `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}` || 'Neue Lektion'
          )
        )}
      </div>
      {is_allerlei && (
        <div className="text-[10px] opacity-80 leading-tight">
          {allerlei_subjects.join(' | ')}
        </div>
      )}
      {!is_allerlei && topic && (
        <div className="text-[10px] font-medium opacity-90 mt-1 truncate">
          {topic.title}
        </div>
      )}
    </div>
  );
};

export default LessonCard;