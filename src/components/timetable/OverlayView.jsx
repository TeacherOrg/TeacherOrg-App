import React, { memo, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { adjustColor } from '@/utils/colorUtils';

const WORK_FORMS = {
  'Single': '👤 Single',
  'Partner': '👥 Partner',
  'Group': '👨‍👩‍👧‍👦 Group',
  'Plenum': '🏛️ Plenum'
};

const OverlayView = forwardRef(({ lesson, schedule, overlayRef, disableHover, isDragging, onMouseMove, onMouseLeave, position, subjectColor }, ref) => {
  if (disableHover || isDragging || position.top === 0) return null;

  // Use lesson.color for Allerlei lessons, fallback to single-color gradient
  const backgroundStyle = lesson.isGradient
    ? lesson.color // Use the multi-color gradient from Allerlei
    : `linear-gradient(135deg, ${subjectColor || '#ffffff'} 0%, ${adjustColor(subjectColor || '#ffffff', -20)} 100%)`;

  const overlayContent = (
    <div
      ref={ref}
      className="overlay fixed z-50 p-2 rounded-lg shadow-lg min-w-[300px]"
      style={{ 
        transition: 'transform 0.2s ease-out', 
        transformOrigin: 'center', 
        top: `${position.top}px`,
        left: `${position.left}px`,
        display: 'block',
        background: backgroundStyle // Updated to use conditional background
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
            <tr>
              <td colSpan="4">
                <hr className="border-t border-white" />
              </td>
            </tr>
            {lesson.steps.map((step, index) => (
                <React.Fragment key={index}>
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
         prev.position.top === next.position.top &&
         prev.lesson.color === next.lesson.color && // Add color to memoization
         prev.lesson.isGradient === next.lesson.isGradient; // Add isGradient to memoization
});

export default OverlayView;