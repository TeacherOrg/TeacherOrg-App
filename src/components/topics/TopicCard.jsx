import React from 'react';
import { createGradient, getTextColorForBackground } from '../../utils/colorUtils';

const TopicCard = ({ topic, onClick }) => {
  const baseColor = topic?.color || '#3b82f6';
  const gradient = createGradient(baseColor);
  const textColor = getTextColorForBackground(gradient);

  return (
    <div
      className="rounded-xl overflow-hidden shadow-md cursor-pointer flex-shrink-0"
      style={{ width: '300px', aspectRatio: '16/9', background: gradient }}
      onClick={onClick}
    >
      <div className="p-4" style={{ color: textColor }}>
        <h3 className="font-bold text-xl">
          {topic.title || topic.name || '(kein Titel)'}
        </h3>
        <p className="text-sm opacity-80">{topic.description || 'Keine Beschreibung'}</p>
      </div>
    </div>
  );
};

export default TopicCard;