import React, { memo } from 'react';
import { createPortal } from 'react-dom';
import { getWorkFormIcon } from '@/utils/workFormUtils';

const LessonOverlay = memo(({ lesson, overlayRef, position, onMouseMove, onMouseLeave, subjectColor }) => {
    if (position.top === 0) return null;

    const overlayContent = (
        <div
            ref={overlayRef}
            className="fixed z-[200] p-4 rounded-lg shadow-2xl border min-w-[350px] max-w-[500px]"
            style={{ 
                top: `${position.top}px`,
                left: `${position.left}px`,
                backgroundColor: '#ffffff',
                borderColor: subjectColor || '#e2e8f0',
                borderWidth: '2px'
            }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            <h3 className="font-bold mb-3 text-center text-slate-900" style={{ color: subjectColor }}>
                {lesson.description || lesson.subject || 'Lektion'}
            </h3>
            
            {lesson.steps?.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="text-sm w-full border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-2 py-2 text-left font-semibold text-slate-700">
                                    <span className="mr-1">⏱️</span>Zeit
                                </th>
                                <th className="px-2 py-2 text-left font-semibold text-slate-700">
                                    <span className="mr-1">👥</span>Form
                                </th>
                                <th className="px-2 py-2 text-left font-semibold text-slate-700">
                                    <span className="mr-1">✏️</span>Ablauf
                                </th>
                                <th className="px-2 py-2 text-left font-semibold text-slate-700">
                                    <span className="mr-1">📦</span>Material
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {lesson.steps.map((step, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                    <td className="px-2 py-2 text-slate-900 font-medium">
                                        {step.time ? `${step.time}min` : ''}
                                    </td>
                                    <td className="px-2 py-2 text-slate-700">
                                        {getWorkFormIcon(step.workForm)}
                                    </td>
                                    <td className="px-2 py-2 text-slate-900">
                                        {step.activity || ''}
                                    </td>
                                    <td className="px-2 py-2 text-slate-700">
                                        {step.material || ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm text-slate-600 text-center py-4">
                    Keine Ablaufinformationen verfügbar
                </p>
            )}
            
            {/* Arrow pointing up to the lesson card */}
            <div 
                className="absolute"
                style={{
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderBottom: `8px solid ${subjectColor || '#e2e8f0'}`
                }}
            />
        </div>
    );

    return createPortal(overlayContent, document.body);
});

LessonOverlay.displayName = 'LessonOverlay';

export default LessonOverlay;