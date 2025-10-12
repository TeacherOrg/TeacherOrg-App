import React from 'react';

const LessonCard = ({ lesson, onClick }) => (
  <div
    className="w-24 h-24 rounded-lg bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-700"
    onClick={onClick}
  >
    {lesson.name}
  </div>
);

export default LessonCard;