import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { adjustColor } from '@/utils/colorUtils';
import { getWorkFormIcon } from '@/utils/workFormUtils';
import { LessonBadge } from '@/components/shared/lesson';

const YearLessonOverlay = memo(({ lesson, overlayRef, position, lessonColor}) => {
    if (position.top === 0 || position.left === 0) return null;

    const getLessonTitle = (les, numberFallback) => {
        return les.name && les.name !== 'Neue Lektion' ? les.name : `Lektion ${numberFallback}`;
    };

    const renderLessonSection = (les, idx, stepsKey = 'steps', showSteps = true) => {
        const title = getLessonTitle(les, les.lesson_number || idx + 1);
        const steps = les[stepsKey] || [];

        return (
            <div key={idx} className="mb-4 border-b border-slate-700 pb-4 last:border-0">
                <h4 className="font-bold mb-2 text-center text-white flex items-center justify-center">
                    {title}
                    {les.is_half_class && <LessonBadge variant="half-class" position="inline" />}
                    {les.is_exam && <LessonBadge variant="exam" position="inline" />}
                </h4>
                {showSteps && steps.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="text-sm w-full border-collapse">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="px-2 py-2 text-left font-bold text-white">
                                        <span className="mr-1">⏱️</span>Zeit
                                    </th>
                                    <th className="px-2 py-2 text-left font-bold text-white">
                                        <span className="mr-1">👥</span>Form
                                    </th>
                                    <th className="px-2 py-2 text-left font-bold text-white">
                                        <span className="mr-1">✏️</span>Ablauf
                                    </th>
                                    <th className="px-2 py-2 text-left font-bold text-white">
                                        <span className="mr-1">📦</span>Material
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {steps.map((step, stepIdx) => (
                                    <tr key={stepIdx} className={stepIdx % 2 === 0 ? 'bg-white/10' : 'bg-black/10'}>
                                        <td className="px-2 py-2 text-white font-medium">
                                            {step.time ? `${step.time}min` : ''}
                                        </td>
                                        <td className="px-2 py-2 text-slate-200">
                                            {getWorkFormIcon(step.workForm)}
                                        </td>
                                        <td className="px-2 py-2 text-white">
                                            {step.activity || ''}
                                        </td>
                                        <td className="px-2 py-2 text-slate-200">
                                            {step.material || ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : showSteps ? (
                    <p className="text-sm text-slate-400 text-center py-4">
                        Keine Ablaufinformationen verfügbar
                    </p>
                ) : null}
            </div>
        );
    };

    let content;
    if (lesson?.mergedLessons) {
        content = lesson.mergedLessons.map((subLesson, idx) => renderLessonSection(subLesson, idx, 'steps', false));
    } else if (lesson?.is_double_lesson && lesson?.second_yearly_lesson_id && lesson.expand?.second_yearly_lesson_id) {
        content = [
            renderLessonSection(lesson, 0, 'steps', false),
            renderLessonSection(lesson.expand.second_yearly_lesson_id, 1, 'steps', false)
        ];
    } else {
        content = renderLessonSection(lesson, 0, 'steps', true);
    }

    const overlayContent = (
        <div
            ref={overlayRef}
            className="fixed z-[200] p-4 rounded-lg shadow-2xl border min-w-[350px] max-w-[500px]"
            style={{ 
                top: `${position.top}px`,
                left: `${position.left}px`,
                background: `linear-gradient(135deg, ${lesson?.color || lesson?.mergedLessons?.[0]?.color || lessonColor || '#1e293b'} 0%, ${adjustColor(lesson?.color || lesson?.mergedLessons?.[0]?.color || lessonColor || '#1e293b', -20)} 100%)`,  
                borderColor: adjustColor(lesson?.color || lesson?.mergedLessons?.[0]?.color || lessonColor || '#1e293b', -10),
                borderWidth: '2px'
            }}
        >
            {content}
        </div>
    );

    return createPortal(overlayContent, document.body);
});

YearLessonOverlay.displayName = 'YearLessonOverlay';

export default YearLessonOverlay;