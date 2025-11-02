// src/pages/GroupsPage.jsx
import React, { useState, useEffect } from "react";
import { Student, Class, Group } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shuffle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, useDroppable, DragOverlay } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import pb from '@/api/pb';

const StudentCard = ({ student, handleDeleteStudent, id }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!student || !student.id) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 backdrop-blur-md mb-2 shadow-sm relative group text-gray-800 dark:text-white w-full touch-none break-words overflow-hidden cursor-move ${isDragging ? "z-50" : ""}`}
    >
      {student.name}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
            handleDeleteStudent(student.id);
          }
        }}
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </div>
  );
};

const StudentPreview = ({ student }) => {
  if (!student || !student.id) return null;

  return (
    <div className="p-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 backdrop-blur-md shadow-sm relative group text-gray-800 dark:text-white min-w-[180px] touch-none">
      {student.name}
    </div>
  );
};

const GroupBox = ({ group, students, index, handleDeleteStudent }) => {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: group.id });

  return (
    <div className={`bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border ${isOver ? 'border-blue-500' : 'border-gray-200 dark:border-slate-700'} p-3 flex flex-col min-h-[300px] min-w-[250px]`}>
      <div className="pb-4 mb-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="font-bold text-gray-800 dark:text-white text-lg tracking-tight">{group.name}</h3>
      </div>
      <SortableContext id={group.id} items={students.map(s => s.id.toString())} strategy={verticalListSortingStrategy}>
        <div ref={setDropRef} className={`p-4 transition-colors rounded-xl min-h-[100px] ${isOver ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
          {students.length > 0 ? (
            students.map((student) => (
              <StudentCard key={student.id} student={student} handleDeleteStudent={handleDeleteStudent} id={student.id.toString()} />
            ))
          ) : (
            <div className="text-center text-gray-500 dark:text-slate-400 p-4 text-sm font-medium">
              Drag students here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default function GroupsPage() {
  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [numGroups, setNumGroups] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStudent, setActiveStudent] = useState(null);
  const [error, setError] = useState(null);

  const { setNodeRef: setUnassignedDropRef, isOver: isOverUnassigned } = useDroppable({ id: 'unassigned' });

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [fetchedStudents, fetchedClasses, fetchedGroups] = await Promise.all([
          Student.list(),
          Class.list(),
          Group.list({ filter: `user_id = "${pb.authStore.model?.id}"` })
        ]);
        console.log('Groups.jsx: Fetched students:', fetchedStudents);
        console.log('Groups.jsx: Fetched classes:', fetchedClasses);
        console.log('Groups.jsx: Fetched groups:', fetchedGroups);
        setAllStudents(fetchedStudents);
        setClasses(fetchedClasses);
        setGroups(fetchedGroups);

        const initialActiveClassId = fetchedClasses.length > 0 ? fetchedClasses[0].id : null;
        setActiveClassId(initialActiveClassId);
      } catch (error) {
        console.error("Groups.jsx: Error loading initial data:", error);
        setError(`Failed to load data: ${error.message}`);
        setAllStudents([]);
        setClasses([]);
        setGroups([]);
        setActiveClassId(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (pb.authStore.model?.id) {
      loadInitialData();
    } else {
      console.warn("Groups.jsx: No authenticated user, skipping data load");
      setIsLoading(false);
      setError("No authenticated user. Please log in.");
    }
  }, []);

  const handleClassChange = async (classId) => {
    setActiveClassId(classId);
    try {
      const fetchedGroups = await Group.list({ filter: `class_id = "${classId}" && user_id = "${pb.authStore.model?.id}"` });
      console.log('Groups.jsx: Fetched groups for class:', fetchedGroups);
      setGroups(fetchedGroups);
    } catch (error) {
      console.error("Groups.jsx: Error loading groups for class:", error);
      setGroups([]);
      setError(`Failed to load groups: ${error.message}`);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      await Student.delete(studentId);
      const updatedStudents = allStudents.filter(s => s.id !== studentId);
      setAllStudents(updatedStudents);

      const updatedGroups = await Promise.all(
        groups
          .filter(g => g.student_ids.includes(studentId))
          .map(async (group) => {
            const updatedStudentIds = group.student_ids.filter(id => id !== studentId);
            await Group.update(group.id, { student_ids: updatedStudentIds });
            return { ...group, student_ids: updatedStudentIds };
          })
      );
      setGroups([...groups.filter(g => !g.student_ids.includes(studentId)), ...updatedGroups]);
    } catch (error) {
      console.error("Groups.jsx: Error deleting student:", error);
      setError(`Failed to delete student: ${error.message}`);
    }
  };

  const handleCreateGroups = async () => {
    if (!activeClassId) {
      alert("Please select a class first.");
      return;
    }
    try {
      const existingGroups = await Group.list({ filter: `class_id = "${activeClassId}" && user_id = "${pb.authStore.model?.id}"` });
      console.log('Groups.jsx: Existing groups before deletion:', existingGroups);
      await Group.batchDelete(existingGroups.map(g => g.id));

      const newGroups = [];
      for (let i = 1; i <= numGroups; i++) {
        const group = await Group.create({
          user_id: pb.authStore.model.id,
          class_id: activeClassId,
          name: `Group ${i}`,
          student_ids: []
        });
        newGroups.push(group);
      }
      console.log('Groups.jsx: Created new groups:', newGroups);
      setGroups(newGroups);
    } catch (error) {
      console.error("Groups.jsx: Error creating groups:", error);
      setError(`Failed to create groups: ${error.message}`);
    }
  };

  const handleRandomize = async () => {
    if (!activeClassId) {
      alert("Please select a class first.");
      return;
    }
    let studentIds = allStudents.filter(s => s.class_id === activeClassId).map(s => s.id.toString());
    for (let i = studentIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [studentIds[i], studentIds[j]] = [studentIds[j], studentIds[i]];
    }

    const groupKeys = groups.map(g => g.id);
    if (groupKeys.length === 0) {
      alert("Please create groups first before randomizing.");
      return;
    }

    try {
      const updatedGroups = await Promise.all(
        groups.map(async (group, index) => {
          const studentIdsForGroup = studentIds.slice(
            Math.floor(index * studentIds.length / groups.length),
            Math.floor((index + 1) * studentIds.length / groups.length)
          );
          await Group.update(group.id, { student_ids: studentIdsForGroup });
          return { ...group, student_ids: studentIdsForGroup };
        })
      );
      console.log('Groups.jsx: Randomized groups:', updatedGroups);
      setGroups(updatedGroups);
    } catch (error) {
      console.error("Groups.jsx: Error randomizing groups:", error);
      setError(`Failed to randomize groups: ${error.message}`);
    }
  };

  const handleClearGroups = async () => {
    if (!window.confirm("Are you sure you want to clear all groups and move students back to unassigned for this class?")) {
      return;
    }
    if (activeClassId) {
      try {
        const existingGroups = await Group.list({ filter: `class_id = "${activeClassId}" && user_id = "${pb.authStore.model?.id}"` });
        console.log('Groups.jsx: Clearing groups:', existingGroups);
        await Group.batchDelete(existingGroups.map(g => g.id));
        setGroups([]);
      } catch (error) {
        console.error("Groups.jsx: Error clearing groups:", error);
        setError(`Failed to clear groups: ${error.message}`);
      }
    }
  };

  const onDragStart = (event) => {
    console.log('Groups.jsx: Drag started:', event.active.id);
    const student = studentsById[event.active.id];
    setActiveStudent(student);
  };

  const onDragEnd = async (event) => {
    console.log('Groups.jsx: Drag ended:', { active: event.active, over: event.over });
    const { active, over } = event;
    setActiveStudent(null);

    if (!over) {
      console.log('Groups.jsx: No drop target');
      return;
    }

    const activeId = active.id.toString();
    const overId = over.id.toString();
    const activeContainer = findContainer(activeId);
    const overContainer = overId; // Use over.id directly as the container ID

    console.log('Groups.jsx: Active container:', activeContainer, 'Over container:', overContainer);

    if (activeContainer === overContainer) {
      if (activeContainer !== 'unassigned') {
        const group = groups.find(g => g.id === activeContainer);
        if (!group) {
          console.log('Groups.jsx: Group not found for container:', activeContainer);
          return;
        }
        const items = [...group.student_ids];
        const oldIndex = items.indexOf(activeId);
        const newIndex = items.indexOf(overId) !== -1 ? items.indexOf(overId) : items.length;
        if (oldIndex === -1) {
          console.log('Groups.jsx: Student not found in active container');
          return;
        }
        const newItems = arrayMove(items, oldIndex, newIndex);
        try {
          await Group.update(activeContainer, { student_ids: newItems });
          setGroups(groups.map(g => g.id === activeContainer ? { ...g, student_ids: newItems } : g));
          console.log('Groups.jsx: Updated group order:', newItems);
        } catch (error) {
          console.error("Groups.jsx: Error updating group order:", error);
          setError(`Failed to update group order: ${error.message}`);
        }
      }
      return;
    }

    const activeGroup = activeContainer === 'unassigned' ? { id: 'unassigned', student_ids: unassignedStudents.map(s => s.id.toString()) } : groups.find(g => g.id === activeContainer);
    const overGroup = overContainer === 'unassigned' ? { id: 'unassigned', student_ids: unassignedStudents.map(s => s.id.toString()) } : groups.find(g => g.id === overContainer);

    if (!activeGroup || !overGroup) {
      console.log('Groups.jsx: Invalid active or over group:', { activeGroup, overGroup });
      return;
    }

    const activeItems = [...activeGroup.student_ids];
    const overItems = [...overGroup.student_ids];
    const oldIndex = activeItems.indexOf(activeId);
    if (oldIndex === -1) {
      console.log('Groups.jsx: Student not found in active container');
      return;
    }
    const newItemsActive = activeItems.filter(id => id !== activeId);
    let newItemsOver = [...overItems];
    const insertIndex = overId === overContainer ? overItems.length : overItems.indexOf(overId);
    newItemsOver.splice(insertIndex === -1 ? overItems.length : insertIndex, 0, activeId);

    try {
      if (activeContainer !== 'unassigned') {
        await Group.update(activeContainer, { student_ids: newItemsActive });
      }
      if (overContainer !== 'unassigned') {
        await Group.update(overContainer, { student_ids: newItemsOver });
      }
      setGroups(groups.map(g => 
        g.id === activeContainer ? { ...g, student_ids: newItemsActive } :
        g.id === overContainer ? { ...g, student_ids: newItemsOver } : g
      ));
      console.log('Groups.jsx: Moved student:', { activeId, from: activeContainer, to: overContainer });
    } catch (error) {
      console.error("Groups.jsx: Error moving student between groups:", error);
      setError(`Failed to move student: ${error.message}`);
    }
  };

  const findContainer = (id) => {
    // If id matches a group ID, return it directly
    if (groups.some(g => g.id === id)) return id;
    // If id is 'unassigned', return it
    if (id === 'unassigned') return 'unassigned';
    // If id is a student ID, find the group containing it
    const group = groups.find(g => g.student_ids.includes(id.toString()));
    return group ? group.id : 'unassigned';
  };

  function arrayMove(arr, fromIndex, toIndex) {
    const newArr = [...arr];
    const element = newArr[fromIndex];
    newArr.splice(fromIndex, 1);
    newArr.splice(toIndex, 0, element);
    return newArr;
  }

  const studentsById = allStudents.reduce((acc, student) => {
    acc[student.id.toString()] = student;
    return acc;
  }, {});

  const unassignedStudents = allStudents
    .filter(s => s.class_id === activeClassId && !groups.some(g => g.student_ids.includes(s.id.toString())))
    .map(s => ({ ...s, id: s.id.toString() }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex justify-between items-center mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-200 dark:from-orange-600 to-gray-50 dark:to-orange-800 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-gray-800 dark:text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight mb-1">Group Maker</h1>
              <p className="text-gray-500 dark:text-slate-400 text-base font-medium">Create and randomize student groups by class.</p>
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-4 tracking-tight">Controls</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-600 dark:text-slate-300">Select Class</label>
                  <Select value={activeClassId || ''} onValueChange={handleClassChange} disabled={isLoading || classes.length === 0}>
                    <SelectTrigger className="bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-2xl text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400">
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="1" 
                    value={numGroups} 
                    onChange={e => setNumGroups(parseInt(e.target.value) || 1)}
                    className="w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 rounded-2xl text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400 p-2"
                  />
                  <Button 
                    onClick={handleCreateGroups}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-2xl font-semibold shadow-lg text-white"
                    disabled={!activeClassId}
                  >
                    Create Groups
                  </Button>
                </div>
                <Button 
                  onClick={handleRandomize} 
                  variant="outline" 
                  className="w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-2xl font-semibold text-gray-800 dark:text-white shadow-lg"
                  disabled={!activeClassId}
                >
                  <Shuffle className="w-4 h-4 mr-2" /> 
                  Randomize
                </Button>
                <Button 
                  onClick={handleClearGroups} 
                  variant="outline" 
                  className="w-full bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-2xl font-semibold text-gray-800 dark:text-white shadow-lg"
                  disabled={!activeClassId}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> 
                  Clear All Groups
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <DndContext collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className={`bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border ${isOverUnassigned ? 'border-blue-500' : 'border-gray-200 dark:border-slate-700'} p-6 flex flex-col min-w-[300px] flex-1 md:flex-none ${unassignedStudents.length === 0 ? 'md:min-w-[300px]' : 'md:min-w-[400px]'}`}>
                  <div className="pb-4 mb-4 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg tracking-tight">Unassigned ({unassignedStudents.length})</h3>
                  </div>
                  <SortableContext id="unassigned" items={unassignedStudents.map(s => s.id.toString())} strategy={rectSortingStrategy}>
                    <div ref={setUnassignedDropRef} className={`p-4 transition-colors rounded-xl min-h-[100px] ${isOverUnassigned ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                      {isLoading ? <p className="text-center text-gray-500 dark:text-slate-400 p-4 text-sm font-medium">Loading...</p> : 
                        !activeClassId ? (
                          <div className="text-center text-gray-500 dark:text-slate-400 p-4 text-sm font-medium">
                            Please select a class to view students.
                          </div>
                        ) : unassignedStudents.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {unassignedStudents.map((student) => (
                              <StudentCard 
                                key={student.id} 
                                student={student} 
                                handleDeleteStudent={handleDeleteStudent} 
                                id={student.id.toString()} 
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 dark:text-slate-400 p-4 text-sm font-medium">
                            All students assigned or no students in this class.
                          </div>
                        )}
                    </div>
                  </SortableContext>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 items-start w-full">
                    {groups.length > 0 ? (
                      groups.map((group, index) => (
                        <GroupBox 
                          key={group.id} 
                          group={group} 
                          students={group.student_ids.map(id => studentsById[id]).filter(Boolean)} 
                          index={index} 
                          handleDeleteStudent={handleDeleteStudent} 
                        />
                      ))
                    ) : (
                      <div className="text-center text-gray-500 dark:text-slate-400 p-4 text-sm font-medium">
                        No groups created. Click "Create Groups" to start.
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