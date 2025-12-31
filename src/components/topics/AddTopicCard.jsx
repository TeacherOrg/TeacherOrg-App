import React from 'react';

const AddTopicCard = ({ onClick }) => (
  <div
    className="rounded-xl border-2 border-dashed border-gray-400 flex items-center justify-center cursor-pointer flex-shrink-0 hover:border-gray-600 transition-colors w-full sm:w-[280px] md:w-[300px] lg:w-[320px]"
    style={{ aspectRatio: '16/9' }}
    onClick={onClick}
  >
    <span className="text-4xl text-gray-400">+</span>
  </div>
);

export default AddTopicCard;