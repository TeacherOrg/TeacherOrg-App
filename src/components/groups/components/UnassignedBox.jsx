import { useDroppable } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { StudentCard } from "./StudentCard";

export function UnassignedBox({ students, isOver, handleDeleteStudent }) {
  const { setNodeRef } = useDroppable({ id: 'unassigned' });

  return (
    <div className={`bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border ${isOver ? 'border-blue-500' : 'border-gray-200 dark:border-slate-700'} p-6 flex flex-col min-w-[300px] flex-1 md:flex-none`}>
      <div className="pb-4 mb-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="font-bold text-gray-800 dark:text-white text-lg">Unassigned ({students.length})</h3>
      </div>
      <SortableContext id="unassigned" items={students.map(s => s.id.toString())} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} className={`p-4 rounded-xl min-h-[100px] transition-colors ${isOver ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
          {students.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {students.map(student => (
                <StudentCard
                  key={student.id}
                  student={student}
                  handleDeleteStudent={handleDeleteStudent}
                  id={student.id.toString()}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-slate-400 p-4 text-sm">
              All students assigned
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}