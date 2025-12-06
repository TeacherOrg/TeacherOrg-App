import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { 
  getTextColor, 
  createGradient, 
  adjustColor 
} from '@/utils/colorUtils';

/**
 * YearLessonCell - Einzelne Lektionszelle im Jahresplan
 */
function YearLessonCell({ 
  lesson, 
  onClick, 
  activeTopicId, 
  defaultColor = '#3b82f6', 
  isDoubleLesson = false,
  isTopicBlock = false,
  onMouseEnter = () => {}, 
  onMouseLeave = () => {}, 
  allYearlyLessons = [],
  densityMode = 'standard',
  // === NEU ===
  lessonSlot,
  lessonData,
  onContextMenu,
  // Drag-Handler Props
  onDragStart,
  onDragOver,
  onDrop,
}) {
  // Endgültig korrekte handleClick
  const handleClick = (e) => {
    // Nur stopPropagation, wenn onClick wirklich eine Funktion ist (normaler Modus)
    // Im Assign-Modus ist onClick meist undefined → Click darf weiterbubbeln zur äußeren div
    if (typeof onClick === 'function') {
      e.stopPropagation();
      onClick();
    }
    // sonst: nichts tun → Bubbling erlaubt → äußere div in YearlyGrid toggelt die Auswahl
  };

  // === NEU ===
  const handleContext = (e) => {
    if (lessonData && onContextMenu) {
      onContextMenu(e, lessonData, lessonSlot);
    }
  };

  // === NEU: Drag-Handler ===
  const handleDragStart = (e) => {
    if (!lesson) return;

    // Alt gedrückt → Kopie, sonst Verschieben
    const isCopy = e.altKey;

    e.dataTransfer.setData('lessonId', lesson.id);
    e.dataTransfer.setData('isCopy', isCopy.toString());
    e.dataTransfer.effectAllowed = isCopy ? 'copy' : 'move';

    // Schickes Ghost-Element
    const ghost = document.createElement('div');
    ghost.textContent = isCopy ? `+ ${lesson.name}` : lesson.name;
    ghost.style.cssText = `
      position: absolute;
      top: -1000px;
      background: ${lesson.color || '#3b82f6'};
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-weight: bold;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.9;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 20, 20);

    // Ghost nach 100ms entfernen
    setTimeout(() => document.body.removeChild(ghost), 100);

    onDragStart?.(e, lesson, lessonSlot, isCopy);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = e.altKey ? 'copy' : 'move';
    onDragOver?.(e);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const lessonId = e.dataTransfer.getData('lessonId');
    const isCopy = e.dataTransfer.getData('isCopy') === 'true';
    onDrop?.(lessonId, lessonSlot, isCopy);
  };

  // DENSITY-KONFIGURATION (unverändert)
  const densityConfig = {
    compact: { 
      padding: '0.25rem', 
      fontSize: '0.625rem', 
      iconSize: '3', 
      lineHeight: '1',
      maxTextLength: 8
    },
    standard: { 
      padding: '0.5rem', 
      fontSize: '0.75rem', 
      iconSize: '4', 
      lineHeight: '1.2',
      maxTextLength: 12
    },
    spacious: { 
      padding: '0.75rem', 
      fontSize: '0.8125rem', 
      iconSize: '5', 
      lineHeight: '1.4',
      maxTextLength: 16
    }
  };

  const config = densityConfig[densityMode] || densityConfig.standard;
  
  const bgColor = lesson?.color || defaultColor;
  const isTopicActive = activeTopicId === lesson?.topic_id;
  const hasContent = lesson?.steps?.length > 0 || (lesson?.notes && String(lesson?.notes).trim());
  const textColor = getTextColor(bgColor);
  const hasExam = allYearlyLessons.some(yl => yl.topic_id === lesson?.id && yl.is_exam);

  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const getDisplayText = () => {
    if (!lesson) return null;
    
    if (isTopicBlock) {
      return (
        <div className="flex flex-col items-center">
          <div 
            className={`font-bold text-center ${config.fontSize} dark:text-white`}
            style={{ lineHeight: config.lineHeight }}
          >
            {truncateText(lesson.name, config.maxTextLength)}
          </div>
        </div>
      );
    }

    if (isDoubleLesson) {
      return (
        <div className="flex flex-col items-center">
          <div 
            className={`font-medium ${config.fontSize} dark:text-white`}
            style={{ lineHeight: config.lineHeight }}
          >
            {truncateText(lesson.name || 'Doppelstunde', config.maxTextLength)}
          </div>
        </div>
      );
    }

    let lessonTitle = lesson.name !== 'Neue Lektion' ? lesson.name : 'Lektion';
    if (lesson.is_copy) lessonTitle += ' (K)';
    const displayTitle = truncateText(lessonTitle, config.maxTextLength);

    return (
      <div className="flex flex-col items-center">
        <div 
          className={`font-medium text-center ${config.fontSize} dark:text-white`}
          style={{ lineHeight: config.lineHeight }}
        >
          {displayTitle}
        </div>
      </div>
    );
  };

  const getEmptyCellContent = () => {
    return (
      <div className={`flex items-center justify-center h-full ${config.padding}`}>
        <Plus 
          className={`${config.iconSize} text-slate-400 group-hover:text-blue-500 transition-colors duration-200`} 
        />
      </div>
    );
  };

  // LEERE ZELLE
  if (!lesson) {
    return (
      <motion.div
        className={`w-full h-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg group hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center overflow-hidden ${config.padding}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        // === NEU ===
        onContextMenu={handleContext}
        // Drag-Handler
        draggable={false}
        onDragOver={handleDragOver}
        onDrop={(e) => {
          e.preventDefault();
          const lessonId = e.dataTransfer.getData('lessonId');
          const isCopy = e.dataTransfer.getData('isCopy') === 'true';
          onDrop?.(lessonId, lessonSlot, isCopy);
        }}
      >
        {getEmptyCellContent()}
      </motion.div>
    );
  }

  // NORMALE ZELLE
  const baseClasses = `w-full h-full cursor-pointer transition-all duration-200 flex items-center justify-center overflow-hidden rounded-lg relative group ${config.padding}`;
  const activeClasses = isTopicActive ? 'ring-2 ring-blue-300/30 shadow-lg' : 'shadow-sm';
  const densityBorder = densityMode === 'compact' ? 'border border-white/20' : '';

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseClasses} ${activeClasses} ${densityBorder}`}
      style={{
        background: createGradient(bgColor, -20),
        border: `2px solid ${adjustColor(bgColor, -10)}`,
        color: textColor
      }}
      onClick={handleClick}
      onMouseEnter={hasContent && typeof onMouseEnter === 'function' ? onMouseEnter : undefined}
      onMouseLeave={hasContent && typeof onMouseLeave === 'function' ? onMouseLeave : undefined}
      // === NEU ===
      onContextMenu={handleContext}
      // Drag-Handler
      draggable={!!lesson}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={(e) => {
        e.preventDefault();
        const lessonId = e.dataTransfer.getData('lessonId');
        const isCopy = e.dataTransfer.getData('isCopy') === 'true';
        onDrop?.(lessonId, lessonSlot, isCopy);
      }}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-lg"
        style={{ background: createGradient(bgColor, -30) }}
      />
      
      {lesson.is_half_class && (
        <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          1/2
        </div>
      )}
      {lesson.is_exam && (
        <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          ❗
        </div>
      )}
      {isTopicBlock && hasExam && (
        <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
          ❗
        </div>
      )}
      
      <div className="relative z-10 text-center flex items-center justify-center h-full">
        {getDisplayText()}
      </div>

      {hasContent && (
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-white/20 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.div>
  );
}

YearLessonCell.displayName = 'YearLessonCell';

export default React.memo(YearLessonCell, (prevProps, nextProps) => {
  return (
    prevProps.lesson?.id === nextProps.lesson?.id &&
    prevProps.activeTopicId === nextProps.activeTopicId &&
    prevProps.defaultColor === nextProps.defaultColor &&
    prevProps.isDoubleLesson === nextProps.isDoubleLesson &&
    prevProps.isTopicBlock === nextProps.isTopicBlock &&
    prevProps.densityMode === nextProps.densityMode
  );
});