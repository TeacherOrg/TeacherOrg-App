import React from 'react';
import { cn } from '@/lib/utils';

/**
 * LessonBadge - Einheitliche Indikator-Badges für Lektionsattribute
 *
 * @param {Object} props
 * @param {'exam' | 'half-class' | 'copy'} props.variant - Badge-Typ
 * @param {'top-left' | 'top-right' | 'inline'} props.position - Positionierung
 * @param {string} props.className - Zusätzliche CSS-Klassen
 * @param {React.ReactNode} props.children - Optionaler Custom-Content
 */
export function LessonBadge({
  variant,
  position = 'top-right',
  className,
  children
}) {
  const baseStyles = 'bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md';

  const positionStyles = {
    'top-left': 'absolute top-1 left-1',
    'top-right': 'absolute top-1 right-1',
    'inline': 'ml-2 inline-flex'
  };

  const variantContent = {
    'exam': '\u2757',        // ❗
    'half-class': '1/2',
    'copy': '(K)'
  };

  return (
    <span className={cn(baseStyles, positionStyles[position], className)}>
      {children || variantContent[variant]}
    </span>
  );
}

export default LessonBadge;
