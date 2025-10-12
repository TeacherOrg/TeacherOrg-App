import React from 'react';
import { adjustColor } from '@/utils/colorUtils';
import { normalizeAllerleiData } from '@/components/timetable/allerlei/AllerleiUtils';

const LessonCard = ({ lesson, isDragging, onEdit, onMouseEnter, onMouseLeave, onMouseMove, subjects = [] }) => {
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
  console.log('Debug: LessonCard subject resolution', {
    lessonId: lesson.id,
    subjectId: subject,
    expandSubjectName: expand?.subject?.name,
    subject_name,
    derivedSubjectName: subjectName,
  });

  const cardStyle = {
    background: isGradient ? color : color,  // Kein Gradient bei false
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
          topicTitle: lesson?.topic?.title,
          subjectName,
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
                lesson?.primaryYearlyLesson?.name || `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}` || 'Primäre (fehlt)'  // Neu: Fallback
              )}
            </div>
          </div>
        ) : (
          lesson?.is_double_lesson && lesson?.second_yearly_lesson_id && lesson?.secondYearlyLesson ? (
            `${lesson?.primaryYearlyLesson?.name || `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}`} + ${lesson?.secondYearlyLesson?.name || `Lektion ${Number(lesson?.primaryYearlyLesson?.lesson_number || 1) + 1}`}`
          ) : (
            lesson?.primaryYearlyLesson?.name || `Lektion ${lesson?.primaryYearlyLesson?.lesson_number || ''}` || 'Primäre (fehlt)'  // Neu: Fallback
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