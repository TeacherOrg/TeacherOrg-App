import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function StudentCard({ student, handleDeleteStudent, id }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  if (!student) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 backdrop-blur-md mb-2 shadow-sm relative group text-gray-800 dark:text-white w-full touch-none cursor-move ${isDragging ? "z-50" : ""}`}
    >
      {student.name}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Delete ${student.name}?`)) {
            handleDeleteStudent(student.id);
          }
        }}
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </div>
  );
}