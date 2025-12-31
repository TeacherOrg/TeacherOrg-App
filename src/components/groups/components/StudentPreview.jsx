export function StudentPreview({ student }) {
  if (!student) return null;

  return (
    <div className="p-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 backdrop-blur-md shadow-sm text-gray-800 dark:text-white min-w-[180px] touch-none">
      {student.name}
    </div>
  );
}