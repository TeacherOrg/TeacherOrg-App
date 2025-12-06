// src/components/lesson-planning/LessonTemplateButton.jsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import LessonTemplatePopover from './LessonTemplatePopover';

export default function LessonTemplateButton({ subjectId, onInsert }) {
  return (
    <LessonTemplatePopover
      subjectId={subjectId}
      onInsert={onInsert}
      trigger={
        <Button variant="ghost" size="icon" title="Lektionsvorlagen">
          <Copy className="w-4 h-4" />
        </Button>
      }
    />
  );
}