import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { adjustColor } from '@/utils/colorUtils';

// Helper function to safely convert any value to a string for rendering
const safeStringify = (value) => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    // Avoid rendering complex objects; show a placeholder or basic info
    if (value.title) return value.title;
    if (value.name) return value.name;
    // As a last resort, stringify, but it's often not user-friendly.
    // For this case, an empty string is better if no simple property is found.
    return ''; 
  }
  return String(value);
};

export default function YearLessonCell({ lesson, onClick, activeTopicId, defaultColor = '#3b82f6', isDoubleLesson = false, onMouseEnter = () => {}, onMouseLeave = () => {} }) {
  const handleClick = () => {
    onClick(lesson, !lesson ? {
      week_number: lesson?.week_number,
      subject: lesson?.subject,
      lesson_number: lesson?.lesson_number
    } : null);
  };

  if (!lesson) {
    return (
      <div
        className="w-full h-full border border-dashed border-slate-400 dark:border-slate-500 rounded-md hover:border-blue-400 hover:bg-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center group"
        onClick={handleClick}
        onMouseEnter={(e) => onMouseEnter(e)}
        onMouseLeave={onMouseLeave}
      >
        <Plus className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
      </div>
    );
  }

  const topic = lesson.topic;
  const bgColor = topic?.color || lesson?.color || defaultColor || '#3b82f6'; // Hier die Änderung
  const isTopicActive = activeTopicId === lesson.topic_id;
  const hasContent = lesson.steps?.length > 0 || (lesson.notes && String(lesson.notes).trim());

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
      onMouseEnter={hasContent ? onMouseEnter : undefined}
      onMouseLeave={hasContent ? onMouseLeave : undefined}
    >
      <div className="flex-1 flex flex-col justify-center text-center leading-tight">
        {topic ? (
          <div className="font-bold text-[10px] mb-1">{safeStringify(topic.title)}</div>
        ) : (
          hasContent ? (
            <div className="text-[10px] opacity-90">
              {safeStringify(lesson.notes) || `Lektion ${safeStringify(lesson.lesson_number)}`}
            </div>
          ) : (
            <div className="text-[10px] opacity-60">Leer</div>
          )
        )}

        {lesson.steps?.length > 0 && (
          <div className="text-[9px] opacity-75 mt-1">
            {lesson.steps.length} Schritt{lesson.steps.length !== 1 ? 'e' : ''}
          </div>
        )}

        <div className="flex justify-center items-center gap-1 mt-1">
          {lesson.is_exam && <span className="text-red-400 text-[8px]">📝</span>}
          {lesson.is_half_class && <span className="text-blue-400 text-[8px]">½</span>}
          {isDoubleLesson && <span className="text-yellow-400 text-[8px]">2×</span>}
        </div>
      </div>
    </motion.div>
  );
}