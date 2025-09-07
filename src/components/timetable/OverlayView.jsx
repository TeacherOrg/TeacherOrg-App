import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { adjustColor } from '@/utils/colorUtils';

const WORK_FORMS = {
  'Single': '👤 Single',
  'Partner': '👥 Partner',
  'Group': '👨‍👩‍👧‍👦 Group',
  'Plenum': '🏛️ Plenum'
};

const OverlayView = memo(({ lesson, schedule, overlayRef, disableHover, isDragging, onMouseMove, onMouseLeave, position, subjectColor }) => {
  if (disableHover || isDragging || position.top === 0) return null;

  const overlayContent = (
    <div
      ref={overlayRef}
      className="overlay fixed z-50 p-2 rounded-lg shadow-lg min-w-[300px]"
      style={{ 
        transition: 'transform 0.2s ease-out', 
        transformOrigin: 'center', 
        top: `${position.top}px`,
        left: `${position.left}px`,
        display: 'block',
        background: `linear-gradient(135deg, ${subjectColor || '#ffffff'} 0%, ${adjustColor(subjectColor || '#ffffff', -20)} 100%)`  // Hier backgroundColor -> subjectColor ersetzt
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <h3 className="font-bold mb-2 text-center text-white">
        {lesson.is_allerlei ? (
          `Allerlei: ${(lesson.allerlei_subjects || []).join(', ')}`
        ) : lesson.topic_id && lesson.topic?.title ? (
          <div>
            <div>{lesson.topic.title}</div>
            <div className="text-xs opacity-75">
              {lesson.is_double_lesson && lesson.second_yearly_lesson_id && lesson.secondYearlyLesson ? (
                `${lesson.primaryYearlyLesson?.name || `Lektion ${lesson.primaryYearlyLesson?.lesson_number || ''}`} + ${lesson.secondYearlyLesson.name || `Lektion ${Number(lesson.primaryYearlyLesson?.lesson_number || 1) + 1}`}`
              ) : (
                lesson.primaryYearlyLesson?.name || `Lektion ${lesson.primaryYearlyLesson?.lesson_number || ''}`
              )}
            </div>
          </div>
        ) : (
          lesson.is_double_lesson && lesson.second_yearly_lesson_id && lesson.secondYearlyLesson ? (
            `${lesson.primaryYearlyLesson?.name || `Lektion ${lesson.primaryYearlyLesson?.lesson_number || ''}`} + ${lesson.secondYearlyLesson.name || `Lektion ${Number(lesson.primaryYearlyLesson?.lesson_number || 1) + 1}`}`
          ) : (
            lesson.primaryYearlyLesson?.name || `Lektion ${lesson.primaryYearlyLesson?.lesson_number || ''}`
          )
        )}
      </h3>
      {lesson.steps?.length > 0 ? (
        <table className="text-sm w-full border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left"><span className="mr-1">⏱️</span>Zeit</th>
              <th className="px-2 py-1 text-left"><span className="mr-1">👥</span>Form</th>
              <th className="px-2 py-1 text-left"><span className="mr-1">✏️</span>Ablauf</th>
              <th className="px-2 py-1 text-left"><span className="mr-1">📦</span>Material</th>
            </tr>
          </thead>
          <tbody>
            {lesson.steps.map((step, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <tr>
                            <td colSpan="4">
                                <hr className="border-t border-gray-300 dark:border-gray-600" />
                            </td>
                        </tr>
                    )}
                    <tr className="bg-transparent">
                        <td className="px-2 py-2 text-white font-medium">
                            {step.time ? `${step.time}min` : ''}
                        </td>
                        <td className="px-2 py-2 text-slate-200">
                            {WORK_FORMS[step.workForm] || step.workForm || ''}
                        </td>
                        <td className="px-2 py-2 text-white">
                            {step.activity || ''}
                        </td>
                        <td className="px-2 py-2 text-slate-200">
                            {step.material || ''}
                        </td>
                    </tr>
                </React.Fragment>
            ))}
        </tbody>
        </table>
      ) : (
        <p className="text-sm">Keine Ablaufinformationen</p>
      )}
    </div>
  );

  return createPortal(overlayContent, document.body);
}, (prev, next) => {
  return prev.lesson.content === next.lesson.content && 
         JSON.stringify(prev.lesson.steps) === JSON.stringify(next.lesson.steps) && 
         prev.disableHover === next.disableHover && 
         prev.isDragging === next.isDragging &&
         prev.position.top === next.position.top;
});

export default OverlayView;