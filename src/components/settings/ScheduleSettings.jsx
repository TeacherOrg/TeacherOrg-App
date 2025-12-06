import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import FixedScheduleTemplateEditor from './FixedScheduleTemplateEditor';

export default function ScheduleSettings({ settings, setSettings, classes, subjects }) {
    if (!settings) return <div className="text-slate-900 dark:text-white">Laden...</div>;

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleTemplateSave = (newTemplate) => {
        handleSettingChange('fixedScheduleTemplate', newTemplate);
    };

    return (
        <div className="space-y-6 text-slate-900 dark:text-white">
            <div>
                <h3 className="text-lg font-semibold">Stundenplan-Einstellungen</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Passen Sie die Struktur Ihres Stundenplans an.</p>
            </div>

            <div className="flex items-center space-x-4 rounded-lg border border-slate-300 dark:border-slate-600 p-4">
                <Label htmlFor="schedule-type" className="flex-1">
                    <span className="font-semibold">Stundenplan-Modus</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Aktuell: <span className="font-bold text-blue-400">{settings.scheduleType === 'flexible' ? 'Flexibler Plan' : 'Fixer Plan'}</span>
                    </p>
                </Label>
                <Switch
                    id="schedule-type"
                    checked={settings.scheduleType === 'fixed'}
                    onCheckedChange={(isChecked) => handleSettingChange('scheduleType', isChecked ? 'fixed' : 'flexible')}
                />
            </div>

            {/* === NEU: Schuljahr-Startwoche === */}
            <div className="flex items-center space-x-4 rounded-lg border border-slate-300 dark:border-slate-600 p-4">
                <Label htmlFor="schoolYearStartWeek" className="flex-1">
                    <span className="font-semibold">Startwoche des Schuljahres</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Woche, ab der das Schuljahr in der Jahresansicht beginnt (1–52)
                    </p>
                </Label>
                <Input
                    id="schoolYearStartWeek"
                    type="number"
                    min="1"
                    max="52"
                    value={settings.schoolYearStartWeek || 35} // typisch KW 35 in DE/AT/CH
                    onChange={(e) => handleSettingChange('schoolYearStartWeek', Number(e.target.value))}
                    className="w-20 text-center"
                />
            </div>

            {settings.scheduleType === 'fixed' && (
                <div className="space-y-4">
                    <h4 className="text-md font-semibold">Vorlagen-Editor für fixen Stundenplan</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Ziehen Sie Fächer in die Zeitfenster.</p>
                    <FixedScheduleTemplateEditor
                        initialTemplate={settings.fixedScheduleTemplate || {}}
                        onSave={handleTemplateSave}
                        classes={classes}
                        subjects={subjects}
                        lessonsPerDay={settings.lessonsPerDay || 8}
                    />
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="startTime">Startzeit</Label>
                    <Input 
                        id="startTime" 
                        type="time" 
                        value={settings.startTime || '08:00'} 
                        onChange={e => handleSettingChange('startTime', e.target.value)}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="lessonsPerDay">Stunden pro Tag</Label>
                    <Input 
                        id="lessonsPerDay" 
                        type="number" 
                        min="1" 
                        max="12"
                        value={settings.lessonsPerDay || 8} 
                        onChange={e => handleSettingChange('lessonsPerDay', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="lessonDuration">Stundendauer (Minuten)</Label>
                    <Input 
                        id="lessonDuration" 
                        type="number" 
                        min="15" 
                        max="120"
                        value={settings.lessonDuration || 45} 
                        onChange={e => handleSettingChange('lessonDuration', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="shortBreak">Kurze Pausendauer (Minuten)</Label>
                    <Input 
                        id="shortBreak" 
                        type="number" 
                        min="0" 
                        max="15"
                        value={settings.shortBreak || 5} 
                        onChange={e => handleSettingChange('shortBreak', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="morningBreakAfter">Morgenpause nach Stunde</Label>
                    <Input 
                        id="morningBreakAfter" 
                        type="number" 
                        min="1" 
                        max="8"
                        value={settings.morningBreakAfter || 2} 
                        onChange={e => handleSettingChange('morningBreakAfter', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="morningBreakDuration">Morgenpausedauer (Minuten)</Label>
                    <Input 
                        id="morningBreakDuration" 
                        type="number" 
                        min="5" 
                        max="60"
                        value={settings.morningBreakDuration || 20} 
                        onChange={e => handleSettingChange('morningBreakDuration', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="lunchBreakAfter">Mittagspause nach Stunde</Label>
                    <Input 
                        id="lunchBreakAfter" 
                        type="number" 
                        min="1" 
                        max="10"
                        value={settings.lunchBreakAfter || 4} 
                        onChange={e => handleSettingChange('lunchBreakAfter', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="lunchBreakDuration">Mittagspausedauer (Minuten)</Label>
                    <Input 
                        id="lunchBreakDuration" 
                        type="number" 
                        min="15" 
                        max="120"
                        value={settings.lunchBreakDuration || 40} 
                        onChange={e => handleSettingChange('lunchBreakDuration', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="afternoonBreakAfter">Nachmittagspause nach Stunde</Label>
                    <Input 
                        id="afternoonBreakAfter" 
                        type="number" 
                        min="1" 
                        max="12"
                        value={settings.afternoonBreakAfter || 6} 
                        onChange={e => handleSettingChange('afternoonBreakAfter', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="afternoonBreakDuration">Nachmittagspausedauer (Minuten)</Label>
                    <Input 
                        id="afternoonBreakDuration" 
                        type="number" 
                        min="5" 
                        max="60"
                        value={settings.afternoonBreakDuration || 15} 
                        onChange={e => handleSettingChange('afternoonBreakDuration', Number(e.target.value))}
                        className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    />
                </div>
            </div>
        </div>
    );
}