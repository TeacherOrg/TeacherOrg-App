import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { adjustColor } from '@/utils/colorUtils';

const WORK_FORMS = {
    'Single': '👤 Single',
    'Partner': '👥 Partner', 
    'Group': '👨‍👩‍👧‍👦 Group',
    'Plenum': '🏛️ Plenum'
};

const YearLessonOverlay = memo(({ lesson, overlayRef, position, onMouseLeave, lessonColor}) => {
    if (position.top === 0 || position.left === 0) return null;

    const overlayContent = (
        <div
            ref={overlayRef}
            className="fixed z-[200] p-4 rounded-lg shadow-2xl border min-w-[350px] max-w-[500px]"
            style={{ 
                top: `${position.top}px`,
                left: `${position.left}px`,
                background: `linear-gradient(135deg, ${lesson?.color || lesson?.mergedLessons?.[0]?.color || lessonColor || '#1e293b'} 0%, ${adjustColor(lesson?.color || lesson?.mergedLessons?.[0]?.color || lessonColor || '#1e293b', -20)} 100%)`,  // Neu: Fallback auf merged[0].color, dann prop, dann dunkelgrau
                borderColor: adjustColor(lesson?.color || lesson?.mergedLessons?.[0]?.color || lessonColor || '#1e293b', -10),
                borderWidth: '2px'
            }}
            onMouseLeave={onMouseLeave}
            >
            <h3 className="font-bold mb-3 text-center text-white" style={{ color: lessonColor }}>
                {lesson?.notes || lesson?.topic?.title || 'Lektion'}
            </h3>
            
            {lesson?.mergedLessons ? (
                lesson.mergedLessons.map((subLesson, idx) => (
                    <div key={idx} className="mb-4 border-b border-slate-700 pb-4 last:border-0">
                        <h4 className="font-bold mb-2 text-center text-white">Lektion {idx + 1} ({subLesson.notes || 'Unbenannt'})</h4>
                        {subLesson.steps?.length > 0 ? (
                            <table className="text-sm w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-700">
                                        <th className="px-2 py-2 text-left font-bold text-white">⏱️ Zeit</th>
                                        <th className="px-2 py-2 text-left font-bold text-white">👥 Form</th>
                                        <th className="px-2 py-2 text-left font-bold text-white">✏️ Ablauf</th>
                                        <th className="px-2 py-2 text-left font-bold text-white">📦 Material</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subLesson.steps.map((step, stepIdx) => (
                                        <tr key={stepIdx} className={stepIdx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-700/50'}>
                                            <td className="px-2 py-2 text-white font-medium">{step.time ? `${step.time}min` : ''}</td>
                                            <td className="px-2 py-2 text-slate-200">{WORK_FORMS[step.workForm] || step.workForm || ''}</td>
                                            <td className="px-2 py-2 text-white">{step.activity || ''}</td>
                                            <td className="px-2 py-2 text-slate-200">{step.material || ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-sm text-slate-400 text-center py-4">Keine Ablaufinformationen</p>
                        )}
                    </div>
                ))
            ) : (
                lesson?.steps?.length > 0 ? (
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
                                {lesson.steps.map((step, index) => (
                                    <tr key={index} className="bg-transparent">
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4">
                        Keine Ablaufinformationen verfügbar
                    </p>
                )
            )}
        </div>
    );

    return createPortal(overlayContent, document.body);
});

YearLessonOverlay.displayName = 'YearLessonOverlay';

export default YearLessonOverlay;