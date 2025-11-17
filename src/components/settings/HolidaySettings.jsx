import React, { useState } from 'react';
import { Holiday } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

const PRESET_VACATIONS = [
    "Sommerferien", "Herbstferien", "Weihnachtsferien", "Sportferien", "Frühlingsferien"
];

const getHolidayEmoji = (type, name = '') => {
    if (type === 'vacation') {
        if (name.includes('Sommer')) return '☀️';
        if (name.includes('Herbst')) return '🍂';
        if (name.includes('Weihnacht')) return '🎄';
        if (name.includes('Sport')) return '⛷️';
        if (name.includes('Frühling')) return '🌸';
        return '🏖️';
    }
    if (type === 'holiday') return '🎉';
    if (type === 'training') return '📚';
    return '📅';
};

export default function HolidaySettings({ holidays = [], refreshData }) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'vacation',
        startDate: '',
        endDate: ''
    });
    const [mode, setMode] = useState('preset'); // 'preset' or 'custom'

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim() || !formData.startDate) {
            alert('Bitte füllen Sie mindestens den Namen und das Startdatum aus.');
            return;
        }
        
        const holidayData = { 
            name: formData.name.trim(), 
            type: formData.type, 
            start_date: formData.startDate, 
            end_date: formData.endDate || formData.startDate 
        };
        
        try {
            await Holiday.create(holidayData);
            setFormData({ name: '', type: 'vacation', startDate: '', endDate: '' });
            setMode('preset');
            if (refreshData) await refreshData();
            window.dispatchEvent(new CustomEvent('holidays-changed')); // Notify other components
        } catch (error) {
            console.error('Fehler beim Speichern der Ferien:', error);
            alert(`Fehler beim Speichern: ${error.message || 'Unbekannter Fehler'}`);
        }
    };

    const handleDeleteHoliday = async (holidayId) => {
        if (!window.confirm('Sind Sie sicher, dass Sie diesen Eintrag löschen möchten?')) return;
        try {
            await Holiday.delete(holidayId);
            if (refreshData) await refreshData();
            window.dispatchEvent(new CustomEvent('holidays-changed')); // Notify other components
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            alert(`Fehler beim Löschen: ${error.message || 'Unbekannter Fehler'}`);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-black dark:text-white">Ferien und Feiertage</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Verwalten Sie hier Schulferien und Feiertage.
                </p>
            </div>
            
            <form onSubmit={handleAddHoliday} className="p-4 bg-white dark:bg-slate-800 rounded-lg space-y-4 border border-slate-300 dark:border-slate-600">
                {/* Mode Selection at the top */}
                <div className="space-y-3">
                    <div className="flex gap-6">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="nameMode" 
                                value="preset"
                                checked={mode === 'preset'}
                                onChange={(e) => {
                                    setMode(e.target.value);
                                    setFormData(prev => ({ ...prev, name: '' }));
                                }}
                                className="text-blue-600"
                            />
                            <span className="text-black dark:text-white">Vordefiniert</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="nameMode" 
                                value="custom"
                                checked={mode === 'custom'}
                                onChange={(e) => {
                                    setMode(e.target.value);
                                    setFormData(prev => ({ ...prev, name: '' }));
                                }}
                                className="text-blue-600"
                            />
                            <span className="text-black dark:text-white">Eigene Angabe</span>
                        </label>
                    </div>
                </div>

                {/* Type and Name/Selection on same row */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm text-slate-600 dark:text-slate-300">Typ</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-black dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="vacation">Ferien</option>
                            <option value="holiday">Feiertag</option>
                            <option value="training">Fortbildung</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        {formData.type === 'vacation' ? (
                            <>
                                <label className="text-sm text-slate-600 dark:text-slate-300">
                                    {mode === 'preset' ? 'Ferien auswählen' : 'Name der Ferien'}
                                </label>
                                {mode === 'preset' ? (
                                    <select
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full p-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-black dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Ferien auswählen...</option>
                                        {PRESET_VACATIONS.map(vac => (
                                            <option key={vac} value={vac}>{vac}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <Input 
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                                        placeholder="Name der Ferien eingeben"
                                        className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                    />
                                )}
                            </>
                        ) : (
                            <>
                                <label className="text-sm text-slate-600 dark:text-slate-300">Name</label>
                                <Input 
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                                    placeholder={`Name für ${formData.type === 'holiday' ? 'Feiertag' : 'Fortbildung'}`}
                                    className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                                    required
                                />
                            </>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm text-slate-600 dark:text-slate-300">Startdatum</label>
                        <Input 
                            type="date" 
                            value={formData.startDate}
                            onChange={(e) => setFormData(prev => ({...prev, startDate: e.target.value}))}
                            className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-600 dark:text-slate-300">Enddatum (optional)</label>
                        <Input 
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => setFormData(prev => ({...prev, endDate: e.target.value}))}
                            className="bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-black dark:text-white"
                        />
                    </div>
                </div>

                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2"/>
                    Hinzufügen
                </Button>
            </form>

            <div className="space-y-2">
                <h4 className="text-md font-semibold text-black dark:text-white">Gespeicherte Einträge</h4>
                {holidays.length === 0 ? (
                    <p className="text-slate-600 dark:text-slate-400 text-sm">Noch keine Einträge vorhanden.</p>
                ) : (
                    <ul className="space-y-2">
                        {holidays.sort((a,b) => new Date(a.start_date) - new Date(b.start_date)).map(h => (
                            <li key={h.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{getHolidayEmoji(h.type, h.name)}</span>
                                    <div>
                                        <p className="font-medium text-black dark:text-white">{h.name}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {new Date(h.start_date).toLocaleDateString('de-DE')} - {new Date(h.end_date).toLocaleDateString('de-DE')}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteHoliday(h.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500"/>
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
