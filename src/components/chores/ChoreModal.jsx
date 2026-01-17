import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ChevronDown, ChevronUp, Coins } from 'lucide-react';

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayTranslations = { monday: "Mo", tuesday: "Di", wednesday: "Mi", thursday: "Do", friday: "Fr", saturday: "Sa", sunday: "So" };
const PRESET_ICONS = ['🧹', '🧺', '🪴', '🧽', '🗑️', '🍎', '🖥️', '📚', '🚪', '♻️', '🐾', '✉️', '🪑', '✨', '💨', '🪣', '🪶', '🍽️', '🧻', '🔔', '🔑', '🎨', '🖼️', '🧼'];

export default function ChoreModal({ isOpen, onClose, onSave, onDelete, chore, canEdit = true }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: '',
        frequency: 'weekly',
        days_of_week: [],
        required_students: '1',
        coin_reward: '0'
    });
    const [showAllIcons, setShowAllIcons] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: chore?.name || '',
                description: chore?.description || '',
                icon: chore?.icon || '',
                frequency: chore?.frequency || 'weekly',
                days_of_week: chore?.days_of_week || [],
                required_students: chore?.required_students ? String(chore.required_students) : '1',
                coin_reward: chore?.coin_reward ? String(chore.coin_reward) : '0'
            });
            setShowAllIcons(false);
        }
    }, [isOpen, chore]);

    const handleDayToggle = (day) => {
        setFormData(prev => {
            const days = Array.isArray(prev.days_of_week) ? prev.days_of_week : [];
            const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
            return { ...prev, days_of_week: newDays };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.description.trim()) {
            alert("Bitte geben Sie eine Beschreibung ein.");
            return;
        }
        const saveData = {
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            frequency: formData.frequency,
            days_of_week: formData.days_of_week,
            required_students: parseInt(formData.required_students, 10) || 1,
            coin_reward: parseInt(formData.coin_reward, 10) || 0
        };
        console.log('Form data before save:', JSON.stringify(saveData, null, 2));
        onSave(saveData);
    };

    const visibleIcons = showAllIcons ? PRESET_ICONS : PRESET_ICONS.slice(0, 7);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white">
                <DialogHeader>
                    <DialogTitle>{chore ? (canEdit ? 'Ämtchen Bearbeiten' : 'Ämtchen Ansehen') : 'Neues Ämtchen Erstellen'}</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                        {chore ? (canEdit ? 'Bearbeiten Sie die Details des Ämtchens.' : 'Details des Ämtchens anzeigen.') : 'Erstellen Sie ein neues Ämtchen indem Sie die Felder ausfüllen.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Team Teaching: View-Only Banner */}
                {!canEdit && (
                    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Nur-Einsicht-Modus – Diese Klasse wurde mit Ihnen geteilt (keine Bearbeitungsrechte)
                        </span>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                            disabled={!canEdit}
                            className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label htmlFor="description">Beschreibung</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            required
                            disabled={!canEdit}
                            className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white"
                        />
                    </div>
                    <div>
                        <Label>Icon</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {visibleIcons.map(icon => (
                                <Button
                                    key={icon}
                                    type="button"
                                    variant={formData.icon === icon ? 'default' : 'outline'}
                                    onClick={() => canEdit && setFormData(prev => ({...prev, icon}))}
                                    disabled={!canEdit}
                                    className={`text-xl p-2 h-12 w-12 transition-all ${formData.icon === icon ? 'bg-blue-600 ring-2 ring-gray-200 dark:ring-white' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600'}`}
                                >
                                    {icon}
                                </Button>
                            ))}
                        </div>
                        {PRESET_ICONS.length > 7 && (
                            <Button 
                                type="button" 
                                variant="link" 
                                onClick={() => setShowAllIcons(!showAllIcons)}
                                className="text-blue-600 dark:text-blue-400 px-0 mt-2"
                            >
                                {showAllIcons ? (
                                    <>
                                        <ChevronUp className="w-4 h-4 mr-2" />
                                        Weniger anzeigen
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="w-4 h-4 mr-2" />
                                        Mehr anzeigen ({PRESET_ICONS.length - 7} weitere)
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="frequency">Häufigkeit</Label>
                            <Select value={formData.frequency} onValueChange={val => setFormData({...formData, frequency: val})} disabled={!canEdit}>
                                <SelectTrigger className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Täglich</SelectItem>
                                    <SelectItem value="weekly">Wöchentlich</SelectItem>
                                    <SelectItem value="bi-weekly">Zweiwöchentlich</SelectItem>
                                    <SelectItem value="monthly">Monatlich</SelectItem>
                                    <SelectItem value="on-demand">Bei Bedarf</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="required_students">Benötigte Schüler</Label>
                            <Input
                                id="required_students"
                                type="number"
                                min="1"
                                value={formData.required_students}
                                onChange={e => setFormData({...formData, required_students: e.target.value})}
                                disabled={!canEdit}
                                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="coin_reward">Coin-Belohnung</Label>
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                id="coin_reward"
                                type="number"
                                min="0"
                                value={formData.coin_reward}
                                onChange={e => setFormData({...formData, coin_reward: e.target.value})}
                                disabled={!canEdit}
                                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white w-24"
                            />
                            <Coins className="w-5 h-5 text-amber-500" />
                            <span className="text-sm text-gray-500 dark:text-slate-400">pro Erledigung</span>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">0 = keine Belohnung</p>
                    </div>
                    {formData.frequency === 'weekly' && (
                        <div>
                            <Label>Aktive Tage</Label>
                            <div className="flex gap-2 mt-2">
                                {days.map(day => (
                                    <Button
                                        key={day}
                                        type="button"
                                        variant={formData.days_of_week?.includes(day) ? 'default' : 'outline'}
                                        onClick={() => canEdit && handleDayToggle(day)}
                                        disabled={!canEdit}
                                        className={`w-10 h-10 ${formData.days_of_week?.includes(day) ? 'bg-blue-600' : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white'}`}
                                    >
                                        {dayTranslations[day]}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </form>
                <DialogFooter className="justify-between">
                    <div>
                        {chore && canEdit && <Button variant="destructive" onClick={() => onDelete(chore.id)}><Trash2 className="w-4 h-4 mr-2"/>Löschen</Button>}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-white">
                            {canEdit ? 'Abbrechen' : 'Schließen'}
                        </Button>
                        {canEdit && <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">Speichern</Button>}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}