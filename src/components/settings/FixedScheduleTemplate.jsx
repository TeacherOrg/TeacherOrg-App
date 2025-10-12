import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_NAMES = {
    monday: 'Montag',
    tuesday: 'Dienstag', 
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag'
};

const generateTimeSlots = (startTime = "08:00", lessonsPerDay = 8, lessonDuration = 45, shortBreak = 5, morningBreakAfter = 2, morningBreakDuration = 20, lunchBreakAfter = 4, lunchBreakDuration = 40, afternoonBreakAfter = 6, afternoonBreakDuration = 15) => {
    const slots = [];
    const [startHour, startMinute] = startTime.split(':').map(Number);
    let currentTime = new Date(2000, 0, 1, startHour, startMinute, 0);

    for (let i = 1; i <= lessonsPerDay; i++) {
        const slotStartTime = new Date(currentTime);
        currentTime.setMinutes(currentTime.getMinutes() + lessonDuration);
        const slotEndTime = new Date(currentTime);

        slots.push({
            period: i,
            start: slotStartTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            end: slotEndTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        });

        if (i < lessonsPerDay) {
            let breakDuration = shortBreak;
            if (i === morningBreakAfter) {
                breakDuration = morningBreakDuration;
            } else if (i === lunchBreakAfter) {
                breakDuration = lunchBreakDuration;
            } else if (i === afternoonBreakAfter) {
                breakDuration = afternoonBreakDuration;
            }
            currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
        }
    }
    return slots;
};

export default function FixedScheduleTemplate({ settings, setSettings, classes, subjects }) {
    const [isLoading, setIsLoading] = useState(false);

    const timeSlots = generateTimeSlots(
        settings.startTime,
        settings.lessonsPerDay,
        settings.lessonDuration,
        settings.shortBreak,
        settings.morningBreakAfter,
        settings.morningBreakDuration,
        settings.lunchBreakAfter,
        settings.lunchBreakDuration,
        settings.afternoonBreakAfter,
        settings.afternoonBreakDuration
    );

    const template = settings.fixedScheduleTemplate || {};

    const handleSlotChange = (day, period, field, value) => {
        setSettings(prev => {
            const newTemplate = { ...prev.fixedScheduleTemplate };
            if (!newTemplate[day]) newTemplate[day] = [];
            
            const existingSlotIndex = newTemplate[day].findIndex(slot => slot.period === period);
            
            if (existingSlotIndex >= 0) {
                if (field === 'clear') {
                    newTemplate[day] = newTemplate[day].filter(slot => slot.period !== period);
                } else {
                    newTemplate[day][existingSlotIndex] = {
                        ...newTemplate[day][existingSlotIndex],
                        [field]: value
                    };
                }
            } else if (field !== 'clear') {
                const newSlot = { period, subject: '', class_id: '' };
                newSlot[field] = value;
                newTemplate[day].push(newSlot);
            }

            return { ...prev, fixedScheduleTemplate: newTemplate };
        });
    };

    const getSlotAssignment = (day, period) => {
        const daySlots = template[day] || [];
        return daySlots.find(slot => slot.period === period);
    };

    const getSubjectsForClass = (classId) => {
        return subjects.filter(s => s.class_id === classId);
    };

    if (isLoading) {
        return <div className="text-center py-8">Lade Daten...</div>;
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <div className="mb-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Definieren Sie für jeden Zeitslot, welche Klasse welches Fach haben soll. 
                    Leere Felder bleiben flexibel planbar.
                </p>
            </div>

            <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header */}
                    <div className="grid grid-cols-6 gap-2 mb-2">
                        <div className="font-semibold text-sm text-slate-600 dark:text-slate-400">Zeit</div>
                        {DAYS.map(day => (
                            <div key={day} className="font-semibold text-sm text-slate-600 dark:text-slate-400 text-center">
                                {DAY_NAMES[day]}
                            </div>
                        ))}
                    </div>

                    {/* Time slots */}
                    {timeSlots.map(slot => (
                        <div key={slot.period} className="grid grid-cols-6 gap-2 mb-2">
                            <div className="flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded p-2 text-xs">
                                <div className="text-center">
                                    <div className="font-bold">{slot.period}</div>
                                    <div>{slot.start}-{slot.end}</div>
                                </div>
                            </div>
                            
                            {DAYS.map(day => {
                                const assignment = getSlotAssignment(day, slot.period);
                                const selectedClass = assignment?.class_id ? classes.find(c => c.id === assignment.class_id) : null;
                                const availableSubjects = selectedClass ? getSubjectsForClass(selectedClass.id) : [];

                                return (
                                    <div key={`${day}-${slot.period}`} className="space-y-1">
                                        <Select 
                                            value={assignment?.class_id || ''} 
                                            onValueChange={(value) => handleSlotChange(day, slot.period, 'class_id', value)}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Klasse" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={null}>Keine Klasse</SelectItem>
                                                {classes.map(cls => (
                                                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        <Select 
                                            value={assignment?.subject || ''} 
                                            onValueChange={(value) => handleSlotChange(day, slot.period, 'subject', value)}
                                            disabled={!assignment?.class_id}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Fach" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={null}>Kein Fach</SelectItem>
                                                {availableSubjects.map(subject => (
                                                    <SelectItem key={subject.id} value={subject.name}>{subject.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {assignment && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSlotChange(day, slot.period, 'clear', null)}
                                                className="h-6 w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}