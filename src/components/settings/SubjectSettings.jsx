
import React, { useState } from 'react';
import { Subject } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit, Check } from 'lucide-react';

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
    '#0ea5e9', '#3b82f6', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
];

const SubjectSettings = ({ subjects, classes, activeClassId, setActiveClassId, refreshData }) => {
    const [newSubject, setNewSubject] = useState({ name: '', color: '#3b82f6', lessons_per_week: 4 });
    const [editingSubjectId, setEditingSubjectId] = useState(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [editingShowColorPicker, setEditingShowColorPicker] = useState(false);

    const handleAddSubject = async () => {
        if (newSubject.name.trim() && activeClassId) {
            await Subject.create({ ...newSubject, class_id: activeClassId });
            setNewSubject({ name: '', color: '#3b82f6', lessons_per_week: 4 });
            setShowColorPicker(false); // Reset color picker visibility
            refreshData();
        }
    };

    const handleUpdateSubject = async (id, field, value) => {
        const subjectToUpdate = subjects.find(s => s.id === id);
        if (subjectToUpdate) {
            await Subject.update(id, { ...subjectToUpdate, [field]: value });
            refreshData();
        }
    };

    const handleDeleteSubject = async (id) => {
        if (window.confirm("Are you sure you want to delete this subject?")) {
            await Subject.delete(id);
            refreshData();
        }
    };
    
    const subjectsForClass = subjects.filter(s => s.class_id === activeClassId);
    const activeClassName = classes.find(c => c.id === activeClassId)?.name || '';

    return (
        <div className="space-y-6">
            <div>
                <Label className="text-lg font-semibold text-white">Klasse auswählen</Label>
                <select
                    value={activeClassId || ''}
                    onChange={(e) => setActiveClassId(e.target.value)}
                    className="w-full mt-2 p-2 rounded-lg border border-slate-600 bg-slate-800 text-white"
                >
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            
            <div className="p-4 border border-slate-700 rounded-lg space-y-4 bg-slate-800">
                <h3 className="font-semibold text-white">Neues Fach hinzufügen</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Fachname</Label>
                            <Input
                                value={newSubject.name}
                                onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                placeholder="z.B. Mathematik"
                                className="bg-slate-700 border-slate-600 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Lektionen/Woche</Label>
                            <Input
                                type="number"
                                min="1"
                                value={newSubject.lessons_per_week}
                                onChange={(e) => setNewSubject({ ...newSubject, lessons_per_week: Number(e.target.value) })}
                                className="bg-slate-700 border-slate-600 text-white"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Farbe wählen</Label>
                        <div className="flex flex-wrap gap-2 items-center">
                            {PRESET_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                                        newSubject.color === color ? 'border-white scale-110 shadow-lg' : 'border-slate-500'
                                    }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {setNewSubject({ ...newSubject, color }); setShowColorPicker(false);}}
                                />
                            ))}
                            {/* RGB Color Picker Button */}
                            <button
                                type="button"
                                className="w-8 h-8 rounded-full border-2 border-slate-500 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:scale-110 transition-all flex items-center justify-center"
                                onClick={() => setShowColorPicker(!showColorPicker)}
                            >
                                <span className="text-white text-xs font-bold">...</span>
                            </button>
                            {showColorPicker && (
                                <Input
                                    type="color"
                                    value={newSubject.color}
                                    onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                                    className="w-14 h-10 p-1 bg-slate-700 border-slate-600"
                                />
                            )}
                        </div>
                    </div>
                     <Button onClick={handleAddSubject} disabled={!activeClassId || !newSubject.name.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2"/>
                        Hinzufügen
                    </Button>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="font-semibold text-white">Bestehende Fächer für "{activeClassName}"</h3>
                <div className="bg-slate-800 rounded-lg border border-slate-700">
                    <div className="divide-y divide-slate-700">
                        {(subjectsForClass || []).map(subject => (
                            <div key={subject.id} className="p-3">
                                {editingSubjectId === subject.id ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                value={subject.name}
                                                onChange={(e) => handleUpdateSubject(subject.id, 'name', e.target.value)}
                                                className="bg-slate-700 border-slate-600 text-white"
                                            />
                                            <Input
                                                type="number"
                                                min="1"
                                                value={subject.lessons_per_week}
                                                onChange={(e) => handleUpdateSubject(subject.id, 'lessons_per_week', Number(e.target.value))}
                                                className="bg-slate-700 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {PRESET_COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                                                        subject.color === color ? 'border-white scale-110' : 'border-transparent'
                                                    }`}
                                                    style={{ backgroundColor: color }}
                                                    onClick={() => {handleUpdateSubject(subject.id, 'color', color); setEditingShowColorPicker(false);}}
                                                />
                                            ))}
                                            <button
                                                type="button"
                                                className="w-7 h-7 rounded-full border-2 border-slate-500 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:scale-110 transition-all flex items-center justify-center"
                                                onClick={() => setEditingShowColorPicker(!editingShowColorPicker)}
                                            >
                                                <span className="text-white text-xs font-bold">...</span>
                                            </button>
                                            {editingShowColorPicker && (
                                                <Input
                                                    type="color"
                                                    value={subject.color}
                                                    onChange={(e) => handleUpdateSubject(subject.id, 'color', e.target.value)}
                                                    className="w-14 h-10 p-1 bg-slate-700 border-slate-600"
                                                />
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" onClick={() => {setEditingSubjectId(null); setEditingShowColorPicker(false);}} className="bg-green-600 hover:bg-green-700">
                                                <Check className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }}></div>
                                            <span className="font-medium">{subject.name}</span>
                                            <span className="text-sm text-slate-400">({subject.lessons_per_week} L/W)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-slate-700" onClick={() => {setEditingSubjectId(subject.id); setEditingShowColorPicker(false);}}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-red-900/30 text-red-500" onClick={() => handleDeleteSubject(subject.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubjectSettings;
