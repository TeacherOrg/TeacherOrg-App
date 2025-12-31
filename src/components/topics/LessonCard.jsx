import React from 'react';

const LessonCard = ({ lesson, onClick, isDouble = false, color }) => (
  <div
    className={`${isDouble ? 'w-52' : 'w-24'} h-24 rounded-lg text-white flex items-center justify-center cursor-pointer hover:opacity-90 relative transition-all`}
    style={{ backgroundColor: color || '#3b82f6' }}
    onClick={onClick}
  >
    {lesson.is_half_class && (
      <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        1/2
      </div>
    )}
    {isDouble && (
      <div className="absolute top-1 left-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        2x
      </div>
    )}
    {lesson.is_exam && (
      <div className="absolute bottom-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        Prüfung
      </div>
    )}
    <span className="text-center px-2 text-sm font-medium">{lesson.name}</span>
  </div>
);

export default LessonCard;