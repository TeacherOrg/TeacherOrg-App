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
 * @param {Object} lesson - Lektionsdaten
 * @param {Function} onClick - Click-Handler
 * @param {string} activeTopicId - Aktives Thema ID
 * @param {string} defaultColor - Standard-Farbe
 * @param {boolean} isDoubleLesson - Doppelstunde?
 * @param {boolean} isTopicBlock - Themenblock?
 * @param {Function} onMouseEnter - Hover-Enter Handler
 * @param {Function} onMouseLeave - Hover-Leave Handler
 * @param {Array} allYearlyLessons - Alle Jahreslektions
 * @param {string} densityMode - Dichte-Modus ('compact'|'standard'|'spacious')
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
  densityMode = 'standard'
}) {
  const handleClick = () => {
    onClick(lesson, !lesson ? {
      week_number: lesson?.week_number,
      subject: lesson?.subject?.name || lesson?.subject || 'Unbekannt',
      lesson_number: lesson?.lesson_number
    } : null);
  };

  // MODERNE DENSITY-KONFIGURATION
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
  
  // CLEAN: Color Utils verwenden
  const bgColor = lesson?.color || defaultColor;
  const isTopicActive = activeTopicId === lesson?.topic_id;
  const hasContent = lesson?.steps?.length > 0 || (lesson?.notes && String(lesson?.notes).trim());
  const textColor = getTextColor(bgColor); // ← Utils-Magie!

  // Text-Truncation mit konfigurierbarer Länge
  const truncateText = (text, maxLength) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  /**
   * Rendert den Anzeigetext basierend auf Lektionstyp
   */
  const getDisplayText = () => {
    if (!lesson) return null;
    
    if (isTopicBlock) {
      // Topic Block: Nur Thema anzeigen
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
      // Double Lesson: Nur Haupttitel anzeigen
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

    // Standard Lesson - Sauber und einfach
    let lessonTitle = lesson.name !== 'Neue Lektion' ? lesson.name : 'Lektion';

    if (lesson.is_copy) {
      lessonTitle += ' (K)';
    }

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

  /**
   * Rendert leere Zelle mit Plus-Icon
   */
  const getEmptyCellContent = () => {
    return (
      <div className={`flex items-center justify-center h-full ${config.padding}`}>
        <Plus 
          className={`${config.iconSize} text-slate-400 group-hover:text-blue-500 transition-colors duration-200`} 
        />
      </div>
    );
  };

  // LEERE ZELLE - Unverändert
  if (!lesson) {
    return (
      <motion.div
        className={`w-full h-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg group hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center overflow-hidden ${config.padding}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
      >
        {getEmptyCellContent()}
      </motion.div>
    );
  }

  // MODERNES ZELLEN-DESIGN - MIT UTILS
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
        // ELEGANT: Utils für perfekten Gradient-Effekt
        background: createGradient(bgColor, -20), // ← Automatischer Overlay-Stil!
        border: `2px solid ${adjustColor(bgColor, -10)}`, // ← Konsistenter Border
        color: textColor // ← Intelligente Textfarbe
      }}
      onClick={handleClick}
      onMouseEnter={hasContent && typeof onMouseEnter === 'function' ? onMouseEnter : undefined}
      onMouseLeave={hasContent && typeof onMouseLeave === 'function' ? onMouseLeave : undefined}
    >
      {/* Subtiles Hover-Overlay - verstärkt den Gradient */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity rounded-lg"
        style={{
          background: createGradient(bgColor, -30) // ← Noch subtiler Hover-Effekt
        }}
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
      
      {/* Content - Sauber und zentriert */}
      <div className="relative z-10 text-center flex items-center justify-center h-full">
        {getDisplayText()}
      </div>

      {/* Hover-Details Indicator - nur bei Inhalt */}
      {hasContent && (
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-white/20 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.div>
  );
}

// Memoization für Performance
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