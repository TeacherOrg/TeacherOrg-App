// src/components/chores/ExtendAssignmentModal.jsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, User, ClipboardList } from 'lucide-react';

export default function ExtendAssignmentModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    student, 
    chore, 
    currentWeekStart 
}) {
    const [weeksToExtend, setWeeksToExtend] = useState(1);

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(weeksToExtend);
        setWeeksToExtend(1); // Reset for next time
    };

    if (!student || !chore) return null;

    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + (weeksToExtend * 7) - 1);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-800 dark:text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-200 dark:from-teal-600 to-gray-50 dark:to-cyan-800 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-gray-800 dark:text-white" />
                        </div>
                        Mehrwöchige Zuweisung
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="bg-gray-100/50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                            <User className="w-4 h-4" />
                            <span className="font-semibold">{student.firstName || student.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-slate-300">
                            <ClipboardList className="w-4 h-4" />
                            <span className="font-semibold">{chore.name}</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <Label htmlFor="weeks">Für wie viele zusätzliche Wochen zuweisen?</Label>
                        <Input
                            id="weeks"
                            type="number"
                            min="1"
                            max="20"
                            value={weeksToExtend}
                            onChange={(e) => setWeeksToExtend(parseInt(e.target.value) || 1)}
                            className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white"
                        />
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            Zuweisung läuft bis: <strong>{endDate.toLocaleDateString('de-DE')}</strong>
                        </p>
                    </div>
                </form>
                
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-800 dark:text-white">
                        Abbrechen
                    </Button>
                    <Button onClick={handleSubmit} className="bg-teal-600 hover:bg-teal-700 text-white">
                        Zuweisen für {weeksToExtend} Woche{weeksToExtend !== 1 ? 'n' : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}