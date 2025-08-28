// src/pages/GroupsPage.jsx
import React, { useState, useEffect } from "react";
import { Student, Class } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shuffle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { DndContext, closestCenter, useDroppable, DragOverlay } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const StudentCard = ({ student, handleDeleteStudent, id }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  if (!student || !student.id) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 backdrop-blur-md mb-2 shadow-sm relative group text-gray-800 dark:text-white w-full touch-none break-words overflow-hidden ${isDragging ? "z-50" : ""}`}
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
  const { setNodeRef: setDropRef } = useDroppable({ id: group.id });

  return (
    <div className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 p-3 flex flex-col min-h-[300px] min-w-[250px]">
      <div className="pb-4 mb-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="font-bold text-gray-800 dark:text-white text-lg tracking-tight">Group {index + 1}</h3>
      </div>
      <SortableContext id={group.id} items={students.map(s => s.id.toString())} strategy={verticalListSortingStrategy}>
        <div ref={setDropRef} className={`p-4 transition-colors rounded-xl min-h-[100px]`}>
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

  const [columns, setColumns] = useState({ unassigned: { id: 'unassigned', studentIds: [] } });
  const [numGroups, setNumGroups] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStudent, setActiveStudent] = useState(null);

  const { setNodeRef: setUnassignedDropRef } = useDroppable({ id: 'unassigned' });

  // Effect to load initial state from localStorage and fetch students/classes
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [fetchedStudents, fetchedClasses] = await Promise.all([Student.list(), Class.list()]);
        setAllStudents(fetchedStudents);
        setClasses(fetchedClasses);

        let initialActiveClassId = null;
        let initialColumns = { unassigned: { id: 'unassigned', studentIds: [] } };
        let initialNumGroups = 2;

        try {
          const storedState = localStorage.getItem('studentGroupsState');
          if (storedState) {
            const persistedState = JSON.parse(storedState);
            if (persistedState && typeof persistedState === 'object' && persistedState.activeClassId && persistedState.columns) {
              initialActiveClassId = persistedState.activeClassId;
              initialColumns = persistedState.columns;
            } else {
              console.warn("Persisted state found, but invalid format. Starting fresh.");
            }
          }
        } catch (error) {
          console.error("Failed to parse persisted state from localStorage:", error);
        }

        let studentsForActiveContext = [];
        if (initialActiveClassId && fetchedClasses.some(c => c.id === initialActiveClassId)) {
          // If a valid active class ID was persisted, use it
          studentsForActiveContext = fetchedStudents.filter(s => s.class_id === initialActiveClassId);
        } else if (fetchedClasses.length > 0) {
          // If no valid active class ID was persisted, default to the first class
          initialActiveClassId = fetchedClasses[0].id;
          studentsForActiveContext = fetchedStudents.filter(s => s.class_id === initialActiveClassId);
        } else {
          // No classes at all, so no students to display/group
          initialActiveClassId = null;
          initialColumns = { unassigned: { id: 'unassigned', studentIds: [] } };
        }

        setActiveClassId(initialActiveClassId);

        // Reconcile loaded columns with actual students for the determined active class
        const validStudentIdsForActiveContext = new Set(studentsForActiveContext.map(s => s.id.toString()));
        const reconciledColumns = { ...initialColumns };

        // Ensure studentIds are strings for consistency
        Object.keys(reconciledColumns).forEach(colId => {
          reconciledColumns[colId].studentIds = reconciledColumns[colId].studentIds.map(id => id.toString()).filter(id => validStudentIdsForActiveContext.has(id));
        });

        // 2. Identify students in the active class that are not in any column and add them to unassigned
        const currentStudentIdsInColumns = new Set();
        Object.values(reconciledColumns).forEach(col => {
          col.studentIds.forEach(id => currentStudentIdsInColumns.add(id));
        });

        const unassignedStudentIdsToAdd = studentsForActiveContext
          .filter(s => !currentStudentIdsInColumns.has(s.id.toString()))
          .map(s => s.id.toString());
        
        reconciledColumns.unassigned.studentIds = [...new Set([...reconciledColumns.unassigned.studentIds, ...unassignedStudentIdsToAdd])];

        setColumns(reconciledColumns);

        // Update numGroups state to reflect the number of groups loaded from persistence
        const loadedGroupCount = Object.keys(reconciledColumns).filter(k => k.startsWith('group-')).length;
        if (loadedGroupCount > 0) {
          initialNumGroups = loadedGroupCount;
        }
        setNumGroups(initialNumGroups);

      } catch (error) {
        console.error("Error loading initial data:", error);
        // Fallback to empty state on error
        setAllStudents([]);
        setClasses([]);
        setActiveClassId(null);
        setColumns({ unassigned: { id: 'unassigned', studentIds: [] } });
        setNumGroups(2);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []); // Empty dependency array, runs once on mount

  // Effect to save columns state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        activeClassId,
        columns,
      };
      localStorage.setItem('studentGroupsState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error("Failed to save state to localStorage:", error);
    }
  }, [activeClassId, columns]); // Dependency on activeClassId and columns state

  const handleClassChange = (classId) => {
    setActiveClassId(classId);
    const studentsOfClass = allStudents.filter(s => s.class_id === classId).map(s => s.id.toString());
    setColumns({
      unassigned: { id: 'unassigned', studentIds: studentsOfClass },
    });
    setNumGroups(2); // Reset group count
  };
  
  const handleDeleteStudent = async (studentId) => {
    try {
      await Student.delete(studentId);
      // Update allStudents state
      const updatedStudents = allStudents.filter(s => s.id !== studentId);
      setAllStudents(updatedStudents);

      // Remove student from all columns and update columns state
      const updatedColumns = { ...columns };
      Object.keys(updatedColumns).forEach(colId => {
        updatedColumns[colId].studentIds = updatedColumns[colId].studentIds.filter(id => id !== studentId.toString());
      });
      setColumns(updatedColumns);
    } catch (error) {
      console.error("Error deleting student:", error);
    }
  };

  const handleCreateGroups = () => {
    if (!activeClassId) {
      alert("Please select a class first.");
      return;
    }
    const studentsInClass = allStudents.filter(s => s.class_id === activeClassId).map(s => s.id.toString());
    const newColumns = { unassigned: { id: 'unassigned', studentIds: studentsInClass } };
    
    for (let i = 1; i <= numGroups; i++) {
      newColumns[`group-${i}`] = { id: `group-${i}`, studentIds: [] };
    }
    setColumns(newColumns);
  };

  const handleRandomize = () => {
    if (!activeClassId) {
      alert("Please select a class first.");
      return;
    }
    let studentIds = allStudents.filter(s => s.class_id === activeClassId).map(s => s.id.toString());
    // Shuffle student IDs
    for (let i = studentIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [studentIds[i], studentIds[j]] = [studentIds[j], studentIds[i]];
    }

    const groupKeys = Object.keys(columns).filter(k => k.startsWith('group-'));
    if (groupKeys.length === 0) {
      alert("Please create groups first before randomizing.");
      return;
    }

    const newColumns = { ...columns };
    // Clear all columns (groups and unassigned) that contain students from the active class
    Object.keys(newColumns).forEach(key => newColumns[key].studentIds = []);

    // Distribute students evenly among groups
    studentIds.forEach((studentId, index) => {
      const groupKey = groupKeys[index % groupKeys.length];
      newColumns[groupKey].studentIds.push(studentId);
    });

    setColumns(newColumns);
  };
  
  const handleClearGroups = () => {
    if (!window.confirm("Are you sure you want to clear all groups and move students back to unassigned for this class?")) {
      return;
    }
    if (activeClassId) {
      handleClassChange(activeClassId); // This effectively resets groups for the active class
    }
  };

  const onDragStart = (event) => {
    const student = studentsById[event.active.id];
    setActiveStudent(student);
  };

  const onDragEnd = (event) => {
    const { active, over } = event;

    setActiveStudent(null);

    if (!over) return;

    const activeContainer = findContainer(active.id);
    let overContainer = findContainer(over.id) || over.id; // Fallback if over.id is the container itself

    if (activeContainer === overContainer) {
      // Reorder within the same container
      const items = [...columns[activeContainer].studentIds];
      const oldIndex = items.indexOf(active.id);
      const newIndex = over.id === activeContainer ? items.length : items.indexOf(over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setColumns({ ...columns, [activeContainer]: { ...columns[activeContainer], studentIds: newItems } });
      return;
    }

    // Move to different container
    const activeItems = [...columns[activeContainer].studentIds];
    const overItems = [...columns[overContainer].studentIds];
    const oldIndex = activeItems.indexOf(active.id);
    const newItemsActive = activeItems.toSpliced(oldIndex, 1);
    let newItemsOver = [...overItems];
    const insertIndex = over.id === overContainer ? overItems.length : overItems.indexOf(over.id);
    newItemsOver.splice(insertIndex, 0, active.id);
    setColumns({
      ...columns,
      [activeContainer]: { ...columns[activeContainer], studentIds: newItemsActive },
      [overContainer]: { ...columns[overContainer], studentIds: newItemsOver },
    });
  };

  const findContainer = (id) => {
    if (id in columns) return id;
    return Object.keys(columns).find((key) => columns[key].studentIds.includes(id));
  };

  function arrayMove(arr, fromIndex, toIndex) {
    const element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
    return arr;
  }

  const studentsById = allStudents.reduce((acc, student) => {
    acc[student.id.toString()] = student;
    return acc;
  }, {});
  
  const groupKeys = Object.keys(columns).filter(k => k.startsWith('group-')); // Filter for actual group keys
  const unassignedStudents = columns.unassigned ? columns.unassigned.studentIds.map(id => studentsById[id]).filter(Boolean) : []; // Filter out null/undefined if student not found

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6 transition-colors duration-300">
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
                {/* Unassigned-Box links, fixed Breite auf md+ */}
                <div className={`bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 flex flex-col min-w-[300px] flex-1 md:flex-none ${unassignedStudents.length === 0 ? 'md:min-w-[300px]' : 'md:min-w-[400px]'}`}>
                  <div className="pb-4 mb-4 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="font-bold text-gray-800 dark:text-white text-lg tracking-tight">Unassigned ({unassignedStudents.length})</h3>
                  </div>
                  <SortableContext id="unassigned" items={unassignedStudents.map(s => s.id.toString())} strategy={rectSortingStrategy}>
                    <div ref={setUnassignedDropRef} className={`p-4 transition-colors rounded-xl min-h-[100px]`}>
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

                {/* Gruppen-Container rechts: Grid mit max. 2 Columns, wrapping vertical */}
                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6 items-start w-full">
                    {groupKeys.map((key, index) => {
                      const group = columns[key];
                      const groupStudents = group.studentIds.map(id => studentsById[id]).filter(Boolean);
                      return (
                        <GroupBox key={group.id} group={group} students={groupStudents} index={index} handleDeleteStudent={handleDeleteStudent} />
                      );
                    })}
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