import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { adjustColor } from '@/utils/colorUtils';

export default function YearLessonCell({ 
  lesson, 
  onClick, 
  activeTopicId, 
  defaultColor = '#3b82f6', 
  isDoubleLesson = false, 
  onMouseEnter = () => {}, 
  onMouseLeave = () => {}, 
  allYearlyLessons = [],
  showCopyIndicator = false // ← HINZUFÜGEN
}) {
  const handleClick = () => {
    onClick(lesson, !lesson ? {
      week_number: lesson?.week_number,
      subject: lesson?.subject?.name || lesson?.subject || 'Unbekannt',
      lesson_number: lesson?.lesson_number
    } : null);
  };

  if (!lesson) {
    return (
      <div
        className="w-full h-full border border-dashed border-slate-400 dark:border-slate-500 rounded-md hover:border-blue-400 hover:bg-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center group"
        onClick={handleClick}
        onMouseEnter={typeof onMouseEnter === 'function' ? onMouseEnter : () => {}}
        onMouseLeave={onMouseLeave}
      >
        <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
      </div>
    );
  }

  const topic = lesson.topic;
  const bgColor = topic?.color || lesson?.color || defaultColor || '#3b82f6';
  const isTopicActive = activeTopicId === lesson.topic_id;
  const hasContent = lesson.steps?.length > 0 || (lesson.notes && String(lesson.notes).trim());

  // Bestimme den Anzeigetext für den Titel
  let lessonTitle = lesson.name !== 'Neue Lektion' ? lesson.name : `Lektion ${lesson.lesson_number}`;
  let lessonNumberDisplay = `Lektion ${lesson.lesson_number}`;

  // Kopie-Markierung hinzufügen
  if (lesson.is_copy) {
    lessonTitle = `${lessonTitle} (Kopie)`;
    lessonNumberDisplay = `${lessonNumberDisplay} (K)`;
  }

  if (isDoubleLesson && lesson.second_yearly_lesson_id) {
    const secondLesson = allYearlyLessons.find(l => String(l.id) === String(lesson.second_yearly_lesson_id));
    console.log('Debug: secondLesson data', { secondLesson, secondYearlyLessonId: lesson.second_yearly_lesson_id, allYearlyLessons });
    if (secondLesson) {
      const secondTitle = secondLesson.name !== 'Neue Lektion' ? secondLesson.name : `Lektion ${Number(lesson.lesson_number) + 1}`;
      lessonTitle = `${lesson.name !== 'Neue Lektion' ? lesson.name : `Lektion ${lesson.lesson_number}`} + ${secondTitle}`;
      lessonNumberDisplay = `Lektion ${lesson.lesson_number} & ${Number(lesson.lesson_number) + 1}`;
    } else {
      lessonTitle = lesson.name !== 'Neue Lektion' ? lesson.name : `Lektion ${lesson.lesson_number}`;
      lessonNumberDisplay = `Lektion ${lesson.lesson_number} & ${Number(lesson.lesson_number) + 1}`;
    }
  }

  console.log('Debug: YearLessonCell props', { lesson, topic, lessonTitle, lessonNumberDisplay, second_yearly_lesson_id: lesson.second_yearly_lesson_id });

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full h-full cursor-pointer transition-all duration-200 flex flex-col justify-between text-white text-xs font-medium rounded-md p-1
        ${isTopicActive ? 'shadow-md' : 'shadow-sm'}
        ${lesson.is_exam ? 'ring-2 ring-red-400' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, ${adjustColor(bgColor, -20)} 100%)`,
      }}
      onClick={handleClick}
      onMouseEnter={hasContent && typeof onMouseEnter === 'function' ? onMouseEnter : undefined}
      onMouseLeave={hasContent && typeof onMouseLeave === 'function' ? onMouseLeave : undefined}
    >
      <div className="flex flex-col items-center justify-center h-full">
        {lesson.topic_id && topic ? (
          // Für Lektionen mit Thema
          <div className="text-center">
            <div>{topic.name}</div>
            <div className="text-[10px] opacity-75">{lessonNumberDisplay}</div>
          </div>
        ) : (
          // Für Lektionen ohne Thema
          <div className="text-center">
            <div className={lesson.is_copy ? "text-yellow-200 font-bold" : ""}>
              {lessonTitle}
            </div>
            {lessonTitle !== lessonNumberDisplay && (
              <div className={`text-[10px] opacity-75 ${lesson.is_copy ? "text-yellow-100" : ""}`}>
                {lessonNumberDisplay}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
