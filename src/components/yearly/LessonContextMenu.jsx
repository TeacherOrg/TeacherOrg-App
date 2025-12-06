// src/components/yearly/LessonContextMenu.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Move, Edit3, Trash2, ArrowDown, ArrowUp } from 'lucide-react';

export default function LessonContextMenu({
  isOpen,
  onClose,
  position,
  onMove,
  onCopy,
  onDuplicateHere,
  onDuplicateNext,
  nextSlotAvailable = false,
  onDuplicatePrev,
  prevSlotAvailable = false,
  onEdit,
  onDelete,
}) {
  // Schließen bei Klick außerhalb
  React.useEffect(() => {
    if (!isOpen) return;
    const handleClick = () => onClose();
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-2 min-w-[220px] overflow-hidden"
        style={{
          top: position.y,
          left: position.x,
          transformOrigin: 'top left',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem icon={<Move className="w-4 h-4" />} onClick={onMove}>
          Verschieben nach…
        </MenuItem>
        <MenuItem icon={<Copy className="w-4 h-4" />} onClick={onCopy}>
          Kopieren nach…
        </MenuItem>

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2 mx-3" />

        {/* Nächste freie Stunde = Pfeil nach oben (weil man im Grid nach oben scrollt) */}
        <MenuItem
          icon={<ArrowUp className="w-4 h-4" />}
          onClick={onDuplicateNext}
          className={nextSlotAvailable 
            ? 'text-emerald-600 dark:text-emerald-400 font-medium' 
            : 'text-red-500 dark:text-red-400 opacity-60'
          }
        >
          In nächste freie Stunde duplizieren
          {!nextSlotAvailable && <span className="text-xs opacity-75 ml-2">(besetzt)</span>}
        </MenuItem>

        {/* Vorherige freie Stunde = Pfeil nach unten */}
        <MenuItem
          icon={<ArrowDown className="w-4 h-4" />}
          onClick={onDuplicatePrev}
          className={prevSlotAvailable 
            ? 'text-emerald-600 dark:text-emerald-400 font-medium' 
            : 'text-red-500 dark:text-red-400 opacity-60'
          }
        >
          In vorherige freie Stunde duplizieren
          {!prevSlotAvailable && <span className="text-xs opacity-75 ml-2">(besetzt)</span>}
        </MenuItem>

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2 mx-3" />

        <MenuItem icon={<Edit3 className="w-4 h-4" />} onClick={onEdit}>
          Bearbeiten
        </MenuItem>
        <MenuItem
          icon={<Trash2 className="w-4 h-4" />}
          onClick={onDelete}
          className="text-red-600 dark:text-red-400"
        >
          Löschen
        </MenuItem>
      </motion.div>
    </AnimatePresence>
  );
}

function MenuItem({ icon, children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}