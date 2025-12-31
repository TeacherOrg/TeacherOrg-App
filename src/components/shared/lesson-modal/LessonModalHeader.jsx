import React from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen } from "lucide-react";

/**
 * Shared header component for LessonModals.
 * Used by both timetable and yearly LessonModals.
 *
 * @param {Object} props
 * @param {string} props.title - Main title text
 * @param {string} props.subtitle - Description text below title
 * @param {string} props.color - Theme color (subject or topic color)
 * @param {string} [props.gradient] - Optional gradient background for icon
 * @param {React.ReactNode} [props.icon] - Optional custom icon (defaults to BookOpen)
 */
export function LessonModalHeader({
  title,
  subtitle,
  color = '#3b82f6',
  gradient,
  icon
}) {
  const iconBackground = gradient || color;

  return (
    <DialogHeader
      className="pb-4 border-b"
      style={{
        borderColor: color + '20',
        background: `linear-gradient(135deg, ${color}15, transparent)`
      }}
    >
      <DialogTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-white">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
          style={{ background: iconBackground }}
        >
          {icon || <BookOpen className="w-5 h-5 text-white" />}
        </div>
        {title}
      </DialogTitle>
      <DialogDescription className="text-slate-500 dark:text-slate-400">
        {subtitle}
      </DialogDescription>
    </DialogHeader>
  );
}

export default LessonModalHeader;
