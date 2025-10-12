import React from 'react';

const TopicCard = ({ topic, onClick }) => (
  <div
    className="rounded-xl overflow-hidden shadow-md cursor-pointer flex-shrink-0"
    style={{ width: '300px', aspectRatio: '16/9', backgroundColor: topic.color || '#3b82f6' }}
    onClick={onClick}
  >
    <div className="p-4 text-white">
      <h3 className="font-bold text-xl">{topic.name}</h3>
      <p className="text-sm opacity-80">{topic.description || 'Keine Beschreibung'}</p>
    </div>
  </div>
);

export default TopicCard;