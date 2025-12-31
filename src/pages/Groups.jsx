import React, { useState } from "react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, DragOverlay, useSensors, useSensor, PointerSensor, KeyboardSensor } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Users } from "lucide-react";
import { useGroups } from "@/components/groups/hooks/useGroups";
import { Controls } from "@/components/groups/components/Controls";
import { UnassignedBox } from "@/components/groups/components/UnassignedBox";
import { GroupBox } from "@/components/groups/components/GroupBox";
import { StudentPreview } from "@/components/groups/components/StudentPreview";
import { SavedGroupSetsSelect } from "@/components/groups/components/SavedGroupSetsSelect"; // falls direkt gebraucht
import { findContainer, arrayMove } from "@/components/groups/utils/dndUtils";

import pb from '@/api/pb';
import { Student, Group } from "@/api/entities";

export default function GroupsPage() {
  const {
    allStudents,
    classes,
    activeClassId,
    groups,
    setGroups,
    savedGroupSets,
    numGroups,
    setNumGroups,
    isLoading,
    error,
    handleClassChange,
    handleCreateGroups,
    handleRandomize,
    handleClearGroups,
    handleSaveCurrentAsSet,
    handleLoadGroupSet,
    handleDeleteGroupSet,
    handleRenameGroupSet,
    handleRenameGroup,
  } = useGroups();

  const [activeStudent, setActiveStudent] = useState(null);
  const [isOverUnassigned, setIsOverUnassigned] = useState(false);

  // Sensor configuration for drag activation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const studentsById = allStudents.reduce((acc, s) => {
    acc[s.id.toString()] = s;
    return acc;
  }, {});

  const unassignedStudents = allStudents
    .filter(s => s.class_id === activeClassId && !groups.some(g => g.student_ids.includes(s.id.toString())))
    .map(s => ({ ...s, id: s.id.toString() }));

  const handleDeleteStudent = async (studentId) => {
    try {
      await Student.delete(studentId);
      setAllStudents(prev => prev.filter(s => s.id !== studentId));

      const affectedGroups = groups.filter(g => g.student_ids.includes(studentId));
      for (const group of affectedGroups) {
        const updatedIds = group.student_ids.filter(id => id !== studentId);
        await Group.update(group.id, { student_ids: updatedIds });
      }
      setGroups(prev => prev.map(g => ({
        ...g,
        student_ids: g.student_ids.filter(id => id !== studentId)
      })));
    } catch (err) {
      console.error(err);
    }
  };

  const onDragStart = (event) => {
    const student = studentsById[event.active.id] || unassignedStudents.find(s => s.id === event.active.id);
    setActiveStudent(student);
  };

  const onDragOver = (event) => {
    setIsOverUnassigned(event.over?.id === 'unassigned');
  };

  const onDragEnd = async (event) => {
    const { active, over } = event;
    setActiveStudent(null);
    setIsOverUnassigned(false);

    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    // Welcher Container ist die Quelle? (Gruppe oder unassigned)
    const activeContainer = findContainer(activeId, groups);

    // Welcher Container ist das Ziel?
    let overContainer;
    if (overId === 'unassigned') {
      overContainer = 'unassigned';
    } else if (groups.some(g => g.id === overId)) {
      overContainer = overId; // über eine ganze GroupBox gezogen
    } else {
      // über eine StudentCard gezogen → finde die Gruppe dieser Karte
      overContainer = findContainer(overId, groups);
    }

    if (!activeContainer || !overContainer) return;

    // Gleicher Container → nur Reihenfolge innerhalb einer Gruppe ändern
    if (activeContainer === overContainer && activeContainer !== 'unassigned') {
      const group = groups.find(g => g.id === activeContainer);
      const oldIndex = group.student_ids.indexOf(activeId);
      if (oldIndex === -1) return;

      let newIndex;
      if (overId === overContainer) {
        newIndex = group.student_ids.length; // ans Ende
      } else {
        newIndex = group.student_ids.indexOf(overId);
        if (newIndex === -1) return;
      }

      const newStudentIds = arrayMove(group.student_ids, oldIndex, newIndex);

      try {
        await Group.update(group.id, { student_ids: newStudentIds });
        setGroups(prev => prev.map(g => g.id === group.id ? { ...g, student_ids: newStudentIds } : g));
      } catch (err) {
        console.error("Fehler beim Reorden innerhalb Gruppe:", err);
      }
      return;
    }

    // Verschieben zwischen Containern (inkl. von/nach unassigned)
    if (activeContainer === overContainer) return; // sollte nicht passieren, aber sicherheitshalber

    // Quelle: student_ids aus der alten Gruppe entfernen
    let sourceGroup = null;
    let sourceNewIds = [];
    if (activeContainer !== 'unassigned') {
      sourceGroup = groups.find(g => g.id === activeContainer);
      sourceNewIds = sourceGroup.student_ids.filter(id => id !== activeId);
    }

    // Ziel: student_ids hinzufügen
    let targetGroup = null;
    let targetNewIds = [];
    if (overContainer !== 'unassigned') {
      targetGroup = groups.find(g => g.id === overContainer);
      targetNewIds = [...targetGroup.student_ids];

      // Einfügeposition bestimmen
      const insertIndex = overId === overContainer 
        ? targetNewIds.length 
        : targetNewIds.indexOf(overId);
      
      if (insertIndex === -1) {
        targetNewIds.push(activeId);
      } else {
        targetNewIds.splice(insertIndex, 0, activeId);
      }
    }

    try {
      // Quelle aktualisieren (nur wenn es eine echte Gruppe war)
      if (sourceGroup) {
        await Group.update(sourceGroup.id, { student_ids: sourceNewIds });
      }

      // Ziel aktualisieren (nur wenn es eine echte Gruppe war)
      if (targetGroup) {
        await Group.update(targetGroup.id, { student_ids: targetNewIds });
      }

      // State aktualisieren
      setGroups(prev => prev.map(g => {
        if (g.id === activeContainer) return { ...g, student_ids: sourceNewIds };
        if (g.id === overContainer) return { ...g, student_ids: targetNewIds };
        return g;
      }));
    } catch (err) {
      console.error("Fehler beim Verschieben zwischen Gruppen:", err);
      // Optional: toast.error("Verschieben fehlgeschlagen");
    }
  };

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6">
      <div className="h-full flex flex-col">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-200 dark:from-orange-600 to-gray-50 dark:to-orange-800 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-gray-800 dark:text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight mb-1">Group Maker</h1>
              <p className="text-gray-500 dark:text-slate-400">Create and randomize student groups by class.</p>
            </div>
          </div>
        </motion.div>

        {error && <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">{error}</div>}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 min-h-0">
          <div className="lg:col-span-1">
            <Controls
              classes={classes}
              activeClassId={activeClassId}
              onClassChange={handleClassChange}
              numGroups={numGroups}
              setNumGroups={setNumGroups}
              onCreateGroups={handleCreateGroups}
              onRandomize={handleRandomize}
              onClearGroups={handleClearGroups}
              savedGroupSets={savedGroupSets}
              onSaveCurrent={handleSaveCurrentAsSet}
              onLoadSet={handleLoadGroupSet}
              onDeleteSet={handleDeleteGroupSet}
              onRenameSet={handleRenameGroupSet}
              disabled={isLoading || !activeClassId || groups.length === 0}
            />
          </div>

          <div className="overflow-hidden flex flex-col min-h-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver}>
              <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
                <UnassignedBox
                  students={unassignedStudents}
                  isOver={isOverUnassigned}
                  handleDeleteStudent={handleDeleteStudent}
                />

                <div className="flex-1 min-w-0 overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groups.length > 0 ? (
                      groups.map((group, index) => (
                        <GroupBox
                          key={group.id}
                          group={group}
                          students={group.student_ids.map(id => studentsById[id]).filter(Boolean)}
                          handleDeleteStudent={handleDeleteStudent}
                          handleRenameGroup={handleRenameGroup}
                          index={index}
                        />
                      ))
                    ) : (
                      <div className="col-span-full text-center text-gray-500 dark:text-slate-400 p-8 text-sm font-medium">
                        Noch keine Gruppen erstellt. Klicke auf "Create Groups", um zu beginnen.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DragOverlay>
                {activeStudent ? <StudentPreview student={activeStudent} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}