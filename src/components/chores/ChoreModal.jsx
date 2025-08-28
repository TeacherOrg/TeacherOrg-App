// src/components/chores/ChoreModal.jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayTranslations = { monday: "Mo", tuesday: "Di", wednesday: "Mi", thursday: "Do", friday: "Fr", saturday: "Sa", sunday: "So" };
const PRESET_ICONS = ['🧹', '🧺', '🪴', '🧽', '🗑️', '🍎', '🖥️', '📚', '🚪', '♻️', '🐾', '✉️', '🪑', '✨', '💨', '🪣', '🪶', '🍽️', '🧻', '🔔', '🔑', '🎨', '🖼️', '🧼'];

export default function ChoreModal({ isOpen, onClose, onSave, onDelete, chore }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        icon: '',
        frequency: 'weekly',
        days_of_week: [],
        required_students: '1',  // Changed to string for controlled input
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
                required_students: chore?.required_students ? String(chore.required_students) : '1',  // Ensure string
            });
            setShowAllIcons(false); // Reset on open
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
        const saveData = {
            ...formData,
            required_students: parseInt(formData.required_students, 10) || 1,  // Parse to number on save, default to 1
        };
        onSave(saveData);
    };

    const visibleIcons = showAllIcons ? PRESET_ICONS : PRESET_ICONS.slice(0, 7);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white">
                <DialogHeader>
                    <DialogTitle>{chore ? 'Ämtchen Bearbeiten' : 'Neues Ämtchen Erstellen'}</DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                        {chore ? 'Bearbeiten Sie die Details des Ämtchens.' : 'Erstellen Sie ein neues Ämtchen indem Sie die Felder ausfüllen.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white"/>
                    </div>
                    <div>
                        <Label htmlFor="description">Beschreibung</Label>
                        <Textarea id="description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white"/>
                    </div>
                    <div>
                        <Label>Icon</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {visibleIcons.map(icon => (
                                <Button
                                    key={icon}
                                    type="button"
                                    variant={formData.icon === icon ? 'default' : 'outline'}
                                    onClick={() => setFormData(prev => ({...prev, icon}))}
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
                            <Select value={formData.frequency} onValueChange={val => setFormData({...formData, frequency: val})}>
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
                                onChange={e => setFormData({...formData, required_students: e.target.value})}  // Keep as string
                                className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white"
                            />
                        </div>
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
                                        onClick={() => handleDayToggle(day)}
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
                        {chore && <Button variant="destructive" onClick={() => onDelete(chore.id)}><Trash2 className="w-4 h-4 mr-2"/>Löschen</Button>}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-white">Abbrechen</Button>
                        <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white">Speichern</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}