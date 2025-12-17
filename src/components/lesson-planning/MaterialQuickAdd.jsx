// src/components/lesson-planning/MaterialQuickAdd.jsx
import React from 'react';

const MaterialQuickAdd = ({ step, onUpdate, topicMaterials = [], topicColor }) => {
  if (!topicMaterials.length) return null;

  const currentMaterials = step.material
    ? step.material.split(',').map(m => m.trim().toLowerCase())
    : [];

  const toggleMaterial = (mat) => {
    const lowerMat = mat.toLowerCase();
    if (currentMaterials.includes(lowerMat)) {
      // entfernen
      const newList = step.material
        .split(',')
        .map(m => m.trim())
        .filter(m => m.toLowerCase() !== lowerMat)
        .join(', ');
      onUpdate('material', newList.replace(/^,\s|,$/g, '').trim());
    } else {
      // hinzufügen
      const newValue = step.material ? `${step.material}, ${mat}` : mat;
      onUpdate('material', newValue);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {topicMaterials.map((mat) => {
        const isSelected = currentMaterials.includes(mat.toLowerCase());
        return (
          <button
            key={mat}
            type="button"
            onMouseDown={(e) => e.preventDefault()} // verhindert Focus-Verlust
            onClick={() => toggleMaterial(mat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shadow-sm
              ${isSelected 
                ? 'text-white shadow-md scale-105' 
                : 'text-white/80 border border-white/30 hover:scale-105 hover:shadow-md'
              }`}
            style={{
              backgroundColor: isSelected ? topicColor : topicColor + '40',
            }}
          >
            {mat}
          </button>
        );
      })}
    </div>
  );
};

export default MaterialQuickAdd;