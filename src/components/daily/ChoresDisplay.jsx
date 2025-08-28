
import React from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, CheckSquare } from 'lucide-react';

export default function ChoresDisplay({ assignments, chores, students, customization }) {
    if (!assignments || assignments.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-center bg-white/50 dark:bg-slate-800/50 rounded-2xl p-6">
              <div>
                <CheckSquare className="w-20 h-20 mx-auto text-green-500 mb-6" />
                <h2 className={`${customization.fontSize.title} font-bold text-slate-700 dark:text-slate-300`}>
                  Alle Ämtchen für heute erledigt!
                </h2>
                <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-400 mt-2`}>
                  Oder es waren keine Ämtchen für heute zugewiesen.
                </p>
              </div>
            </div>
        );
    }
    
    const choresById = chores.reduce((acc, chore) => ({ ...acc, [chore.id]: chore }), {});
    const studentsById = students.reduce((acc, student) => ({ ...acc, [student.id]: student }), {});

    const assignmentsByChore = assignments.reduce((acc, assignment) => {
        const chore = choresById[assignment.chore_id];
        if (!chore) return acc;
        
        if (!acc[chore.name]) {
            acc[chore.name] = {
                chore,
                students: []
            };
        }
        
        const student = studentsById[assignment.student_id];
        if (student) {
            acc[chore.name].students.push(student.name);
        }
        
        return acc;
    }, {});

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col p-6"
        >
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                <ClipboardList className="w-10 h-10 text-cyan-500" />
                <div>
                    <h2 className={`${customization.fontSize.title} font-bold text-slate-800 dark:text-slate-200`}>
                        Heutige Ämtchen
                    </h2>
                    <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-400`}>
                        Wer ist heute dran?
                    </p>
                </div>
            </div>

            <div className="overflow-y-auto space-y-4">
                {Object.values(assignmentsByChore).map(({ chore, students }, index) => (
                    <motion.div
                        key={chore.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg"
                    >
                        <h3 className={`${customization.fontSize.content} font-bold text-slate-700 dark:text-slate-300 flex items-center gap-3`}>
                            {chore.icon && <span className="text-2xl">{chore.icon}</span>}
                            <span>{chore.name}</span>
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {students.map((studentName, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                                    {studentName}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
