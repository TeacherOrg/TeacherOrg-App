// src/components/yearly/LessonContextMenu.jsx
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Move, Edit3, Trash2, ArrowDown, ArrowUp } from 'lucide-react';

const MENU_WIDTH = 240;
const MENU_HEIGHT = 320; // ca. – wird später genau gemessen
const PADDING = 8;

export default function LessonContextMenu({
  isOpen,
  onClose,
  cellRect,           // ← neu: DOMRect der Zelle
  onMove,
  onCopy,
  onDuplicateNext,
  nextSlotAvailable = false,
  onDuplicatePrev,
  prevSlotAvailable = false,
  onEdit,
  onDelete,
}) {
  const menuRef = useRef(null);

  // Berechne beste Position relativ zur Zelle
  const position = React.useMemo(() => {
    if (!cellRect) return { top: 0, left: 0, placement: 'bottom-right' };

    const scrollContainer = document.querySelector('.yearly-main-grid .yearly-table-container');
    const containerRect = scrollContainer?.getBoundingClientRect() || { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };

    let top = cellRect.bottom + PADDING;
    let left = cellRect.left;
    let placement = 'bottom-left'; // Standard: unten links von der Zelle (natürlicher für Tabellen)

    // Prüfe Platz unten
    if (top + MENU_HEIGHT > containerRect.bottom) {
      top = cellRect.top - MENU_HEIGHT - PADDING;
      placement = 'top-left';
    }

    // Prüfe Platz rechts
    if (left + MENU_WIDTH > containerRect.right) {
      left = cellRect.right - MENU_WIDTH;
      placement = placement.replace('left', 'right');
    }

    // Falls links rausgehen würde
    if (left < containerRect.left) {
      left = containerRect.left + PADDING;
    }

    // Vertikale Korrektur
    if (top < containerRect.top + PADDING) {
      top = containerRect.top + PADDING;
    }

    return { top: top - containerRect.top, left: left - containerRect.left, placement };
  }, [cellRect]);

  // Schließen bei Klick außerhalb
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      onClose();
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !cellRect) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -8 }}
        transition={{ duration: 0.15 }}
        className="absolute z-[1000] bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 py-2 min-w-[240px] overflow-hidden"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transformOrigin: position.placement.includes('top') ? 'bottom left' : 'top left',
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <MenuItem icon={<Move className="w-4 h-4" />} onClick={onMove}>
          Verschieben nach…
        </MenuItem>
        <MenuItem icon={<Copy className="w-4 h-4" />} onClick={onCopy}>
          Kopieren nach…
        </MenuItem>

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2 mx-3" />

        <MenuItem
          icon={<ArrowUp className="w-4 h-4" />}
          onClick={onDuplicateNext}
          className={nextSlotAvailable ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 opacity-60'}
        >
          In nächste freie Stunde duplizieren
          {!nextSlotAvailable && <span className="text-xs opacity-75 ml-2">(besetzt)</span>}
        </MenuItem>

        <MenuItem
          icon={<ArrowDown className="w-4 h-4" />}
          onClick={onDuplicatePrev}
          className={prevSlotAvailable ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-500 dark:text-red-400 opacity-60'}
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
      onClick={() => {
        onClick();
      }}
      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}