import React from 'react';

const WORK_FORMS = {
    'Single': '👤 Single',
    'Partner': '👥 Partner',
    'Group': '👨‍👩‍👧‍👦 Group',
    'Plenum': '🏛️ Plenum'
};

const LessonDetailOverlay = ({ lesson, subject, position }) => {
  if (!lesson) return null;

  const style = {
    top: `${position.top}px`,
    left: `${position.left}px`,
    '--subject-color': subject?.color || '#4f46e5',
  };

  return (
    <div
      style={style}
      className="fixed z-50 p-4 rounded-xl shadow-2xl min-w-[350px] bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-[var(--subject-color)] transition-opacity duration-200"
    >
      <h3 
        className="font-bold mb-3 text-center text-lg p-2 rounded-lg text-white"
        style={{ backgroundColor: subject?.color || '#4f46e5' }}
      >
        {lesson.is_allerlei ? (
          `Allerlei: ${(lesson.allerlei_subjects || []).join(', ')}`
        ) : lesson.topic_id && lesson.topic?.title ? (
          <div>
            <div>{lesson.topic.title}</div>
            <div className="text-sm opacity-75">
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
      
      {lesson.steps && lesson.steps.length > 0 ? (
        <table className="text-sm w-full border-collapse text-slate-700 dark:text-slate-300">
          <thead>
            <tr className="border-b-2 border-slate-200 dark:border-slate-600">
              <th className="p-2 text-left font-semibold">Zeit</th>
              <th className="p-2 text-left font-semibold">Form</th>
              <th className="p-2 text-left font-semibold">Ablauf</th>
              <th className="p-2 text-left font-semibold">Material</th>
            </tr>
          </thead>
          <tbody>
            {lesson.steps.map((step, index) => (
              <tr key={step.id || index} className="border-b border-slate-200/50 dark:border-slate-700/50 last:border-b-0">
                <td className="p-2 align-top">{step.time ? `${step.time}'` : '-'}</td>
                <td className="p-2 align-top">{WORK_FORMS[step.workForm] || step.workForm || '-'}</td>
                <td className="p-2 align-top">{step.activity || '-'}</td>
                <td className="p-2 align-top">{step.material || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">Keine Detailplanung vorhanden.</p>
      )}
    </div>
  );
};

export default LessonDetailOverlay;