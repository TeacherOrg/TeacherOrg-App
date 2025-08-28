import React, { useState, useEffect, useCallback } from 'react';
import { DailyNote } from '@/api/entities';
import { User } from '@/api/entities';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, NotebookPen } from 'lucide-react';
import { motion } from 'framer-motion';
import { debounce } from 'lodash';

export default function TeacherNotesPanel({ selectedDate, customization }) {
    const [note, setNote] = useState(null);
    const [content, setContent] = useState('');
    const [user, setUser] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                console.error("User not found for notes panel");
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (!user) return;
        
        const dateString = selectedDate.toISOString().split('T')[0];

        const fetchNote = async () => {
            const notes = await DailyNote.filter({ 
                date: dateString,
                created_by: user.email 
            });
            if (notes.length > 0) {
                setNote(notes[0]);
                setContent(notes[0].content);
            } else {
                setNote(null);
                setContent('');
            }
        };
        fetchNote();
    }, [selectedDate, user]);

    const debouncedSave = useCallback(
        debounce(async (newContent) => {
            setIsSaving(true);
            const dateString = selectedDate.toISOString().split('T')[0];

            try {
                if (note) {
                    const updatedNote = await DailyNote.update(note.id, { content: newContent });
                    setNote(updatedNote);
                } else {
                    const newNote = await DailyNote.create({ date: dateString, content: newContent });
                    setNote(newNote);
                }
            } catch(e) {
                console.error("Error saving note: ", e);
            } finally {
                setTimeout(() => setIsSaving(false), 1000);
            }
        }, 1500), 
    [note, selectedDate]);

    const handleContentChange = (e) => {
        setContent(e.target.value);
        debouncedSave(e.target.value);
    };

    if (!customization.showNotes) {
        return null;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col"
        >
            <div className="bg-slate-100 dark:bg-slate-700 p-3 border-b border-slate-200 dark:border-slate-600">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         <NotebookPen className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <h3 className={`${customization.fontSize.content} font-bold text-slate-800 dark:text-slate-200`}>
                            Meine Notizen
                        </h3>
                    </div>
                    {isSaving && <Save className="w-4 h-4 text-blue-500 animate-pulse" />}
                </div>
            </div>
            <div className="p-4 flex-1">
                <Textarea
                    placeholder="Schreiben Sie hier Ihre Notizen für den Tag..."
                    value={content}
                    onChange={handleContentChange}
                    className="w-full h-full bg-transparent border-0 focus-visible:ring-0 resize-none text-base"
                />
            </div>
        </motion.div>
    );
}