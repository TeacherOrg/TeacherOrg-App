import React from 'react';

const LessonCard = ({ lesson, onClick }) => (
  <div
    className="w-24 h-24 rounded-lg bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-700 relative"
    onClick={onClick}
  >
    {lesson.is_half_class && (
      <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        1/2
      </div>
    )}
    {lesson.name}
  </div>
);

export default LessonCard;