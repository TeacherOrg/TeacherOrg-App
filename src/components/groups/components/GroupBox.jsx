import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { StudentCard } from "./StudentCard";

// Feste, schöne Farben für bis zu 8 Gruppen (wiederholt sich bei mehr)
// Reihenfolge: Grün, Blau, Violett, Orange, Pink, Teal, Amber, Rose
const groupColors = [
  { header: 'bg-gradient-to-br from-emerald-500 to-emerald-700', light: 'bg-emerald-50 dark:bg-emerald-900/40' },
  { header: 'bg-gradient-to-br from-blue-500 to-blue-700', light: 'bg-blue-50 dark:bg-blue-900/40' },
  { header: 'bg-gradient-to-br from-violet-500 to-violet-700', light: 'bg-violet-50 dark:bg-violet-900/40' },
  { header: 'bg-gradient-to-br from-orange-500 to-orange-700', light: 'bg-orange-50 dark:bg-orange-900/40' },
  { header: 'bg-gradient-to-br from-pink-500 to-pink-700', light: 'bg-pink-50 dark:bg-pink-900/40' },
  { header: 'bg-gradient-to-br from-teal-500 to-teal-700', light: 'bg-teal-50 dark:bg-teal-900/40' },
  { header: 'bg-gradient-to-br from-amber-500 to-amber-700', light: 'bg-amber-50 dark:bg-amber-900/40' },
  { header: 'bg-gradient-to-br from-rose-500 to-rose-700', light: 'bg-rose-50 dark:bg-rose-900/40' },
];

export function GroupBox({ group, students, handleDeleteStudent, handleRenameGroup, index }) {
  const { setNodeRef, isOver } = useDroppable({ id: group.id });
  const colors = groupColors[index % groupColors.length];
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const handleSaveName = () => {
    if (editName.trim() && editName !== group.name) {
      handleRenameGroup(group.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditName(group.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden transition-all flex flex-col min-h-[250px]">
      {/* Farbiger Header */}
      <div className={`${colors.header} px-5 py-4`}>
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            autoFocus
            className="font-semibold text-white text-lg bg-transparent border-b-2 border-white/50 outline-none w-full placeholder-white/70"
            placeholder="Gruppenname..."
          />
        ) : (
          <h3
            className="font-semibold text-white text-lg cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              setEditName(group.name);
              setIsEditing(true);
            }}
            title="Klicken zum Umbenennen"
          >
            {group.name}
          </h3>
        )}
      </div>

      {/* Drop-Bereich */}
      <SortableContext id={group.id} items={students.map(s => s.id.toString())} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex-1 p-3 min-h-[80px] transition-all ${isOver ? colors.light : ''}`}
        >
          {students.length > 0 ? (
            students.map(student => (
              <StudentCard
                key={student.id}
                student={student}
                handleDeleteStudent={handleDeleteStudent}
                id={student.id.toString()}
              />
            ))
          ) : (
            <div className="text-center text-gray-500 dark:text-slate-400 py-8 text-sm">
              Schüler:innen hierher ziehen
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}