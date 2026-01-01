import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, BookOpen } from "lucide-react";
import YearLessonCell from "./YearLessonCell";
import LessonModal from "./LessonModal";

// Ultra-safe string conversion
const ultraSafeString = (value) => {
  try {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') {
      if (React.isValidElement(value)) return ''; // Don't render React elements as text
      if (Array.isArray(value)) return value.length.toString();
      if (value.title) return ultraSafeString(value.title);
      if (value.name) return ultraSafeString(value.name);
      return '[Objekt]';
    }
    return String(value);
  } catch (e) {
    console.warn('ultraSafeString error:', e);
    return '';
  }
};

export default function TopicLessonsModal({ 
  isOpen, 
  onClose, 
  topicLessons: initialTopicLessons, 
  topic, 
  subject, 
  week,
  activeTopicId,
  subjectColor,
  allYearlyLessons,
  onSaveLesson,
  onDeleteLesson,
  topics,
  currentYear
}) {
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);

  const safeTopicLessons = useMemo(() => {
    try {
      if (!allYearlyLessons || !topic?.id || !subject || !week || !currentYear) return [];
      
      return allYearlyLessons
        .filter(lesson => 
          lesson && 
          lesson.topic_id === topic.id &&
          lesson.subject === subject &&
          lesson.week_number === week &&
          lesson.school_year === currentYear
        )
        .sort((a, b) => (parseInt(a.lesson_number) || 0) - (parseInt(b.lesson_number) || 0));
    } catch (e) {
      console.error('Error computing safeTopicLessons:', e);
      return [];
    }
  }, [allYearlyLessons, topic?.id, subject, week, currentYear]);

  // Memo für gefilterte Topics
  const sortedLessons = useMemo(() => {
    try {
      return [...safeTopicLessons].sort((a, b) => (parseInt(a.lesson_number) || 0) - (parseInt(b.lesson_number) || 0));
    } catch (e) {
      console.error('Error sorting lessons:', e);
      return [];
    }
  }, [safeTopicLessons]);

  const gridColumns = useMemo(() => {
    if (sortedLessons.length === 0) {
      return { totalWidth: 2, columns: 'repeat(2, minmax(0, 1fr))' };
    }
    let totalWidth = 0;
    let i = 0;
    while (i < sortedLessons.length) {
      const lesson = sortedLessons[i];
      if (!lesson) {
        i++;
        continue;
      }

      // Unified Doppellektionen (ohne second_id) UND linked Doppellektionen
      if (lesson.is_double_lesson) {
        totalWidth += 2;
        // Bei linked doubles (mit second_id) überspringe die zweite Lektion
        if (lesson.second_yearly_lesson_id) {
          i += 2;
        } else {
          i += 1; // Unified double: nur 1 Eintrag, aber 2 Breite
        }
      } else if (lesson.is_half_class) {
        // Handle half-class without extra span
        totalWidth += 1;
        i += 1;
      } else {
        totalWidth += 1;
        i += 1;
      }
    }
    const finalTotalWidth = Math.max(2, totalWidth);
    return {
      totalWidth: finalTotalWidth,
      columns: `repeat(${finalTotalWidth}, minmax(0, 1fr))`
    };
  }, [sortedLessons]);

  // Calculate dynamic modal width based on grid columns
  const modalWidth = useMemo(() => {
    const baseWidth = 400;
    const columnWidth = 120;
    const padding = 100;
    return Math.min(1200, Math.max(baseWidth, gridColumns.totalWidth * columnWidth + padding));
  }, [gridColumns]);

  // Berechne Gesamtanzahl der Unterrichtsstunden (Doppellektionen = 2)
  // WICHTIG: Muss VOR dem early return sein wegen React Rules of Hooks
  const totalLessonCount = useMemo(() => {
    return safeTopicLessons.reduce((sum, lesson) => {
      return sum + (lesson.is_double_lesson ? 2 : 1);
    }, 0);
  }, [safeTopicLessons]);

  // Early return with error boundary
  try {
    if (!isOpen) return null;
    if (safeTopicLessons.length === 0 && !topic) return null;
  } catch (e) {
    console.error('Early return error:', e);
    return null;
  }

  const handleEdit = (lesson) => {
    try {
      // Hole immer die aktuellste Version aus allYearlyLessons
      const freshLesson = allYearlyLessons.find(l => l.id === lesson.id);
      const lessonToEdit = freshLesson ? {
        ...freshLesson,
        topic: topic || null,
        topic_id: freshLesson.topic_id || topic?.id || '',
        color: topic?.color || subjectColor || '#3b82f6'
      } : lesson;

      setEditingLesson(lessonToEdit);
      setIsLessonModalOpen(true);
    } catch (e) {
      console.error('handleEdit error:', e);
    }
  };

  const handleSave = async (data) => {
    try {
      if (onSaveLesson) {
        await onSaveLesson(data, editingLesson);
      }
      // Modal wird NICHT hier geschlossen - das macht der onClose callback vom LessonModal
      // So funktioniert "Speichern & nächste" korrekt
    } catch (error) {
      console.error('Error in TopicLessonsModal handleSave:', error);
      setIsLessonModalOpen(false);
      setEditingLesson(null);
    }
  };

  const handleDelete = async (lessonId) => {
    try {
      if (onDeleteLesson) {
        await onDeleteLesson(lessonId);
      }
      
      setIsLessonModalOpen(false);
      setEditingLesson(null);
      
    } catch (error) {
      console.error('Error in TopicLessonsModal handleDelete:', error);
      setIsLessonModalOpen(false);
      setEditingLesson(null);
    }
  };

  // Ultra-safe rendering
  const renderContent = () => {
    try {
      const cells = [];
      let i = 0;
      
      while (i < sortedLessons.length) {
        try {
          const lesson = sortedLessons[i];
          if (!lesson) {
            i++;
            continue;
          }

          let span = 1;

          // Unified Doppellektionen (ohne second_id) UND linked Doppellektionen
          if (lesson.is_double_lesson) {
            span = 2;
            // Bei linked doubles (mit second_id) überspringe die zweite Lektion
            if (lesson.second_yearly_lesson_id) {
              i += 2;
            } else {
              i += 1; // Unified double: nur 1 Eintrag, aber 2 Breite
            }
          } else if (lesson.is_half_class) {
            span = 1; // No extra span for half-class
            i += 1;
          } else {
            span = 1;
            i += 1;
          }

          // Create ultra-safe lesson object with added fields
          const safeLesson = {
            ...lesson,
            id: ultraSafeString(lesson.id),
            lesson_number: parseInt(lesson.lesson_number) || 0,
            week_number: parseInt(lesson.week_number) || parseInt(week) || 0,
            notes: ultraSafeString(lesson.notes),
            subject: ultraSafeString(lesson.subject || subject),
            is_double_lesson: !!lesson.is_double_lesson,
            is_exam: !!lesson.is_exam,
            is_half_class: !!lesson.is_half_class,
            second_yearly_lesson_id: ultraSafeString(lesson.second_yearly_lesson_id),
            steps: Array.isArray(lesson.steps) ? lesson.steps : [],
            topic: topic || null,
            topic_id: ultraSafeString(lesson.topic_id || topic?.id),
            color: topic?.color || subjectColor || '#3b82f6'
          };

          cells.push(
            <div 
              key={safeLesson.id} 
              style={{ gridColumn: `span ${span}` }} 
              className="h-20 p-1"
            >
              <YearLessonCell
                lesson={safeLesson}
                onClick={() => handleEdit(safeLesson)}
                activeTopicId={activeTopicId}
                defaultColor={ultraSafeString(subjectColor || '#3b82f6')}
                isDoubleLesson={safeLesson.is_double_lesson}
              />
            </div>
          );
        } catch (cellError) {
          console.error('Cell render error:', cellError);
          i++;
          continue;
        }
      }
      
      return cells;
    } catch (e) {
      console.error('renderContent error:', e);
      return [
        <div key="error" className="h-20 p-1 flex items-center justify-center text-red-400 text-xs">
          Fehler beim Laden der Lektionen
        </div>
      ];
    }
  };

  const safeTopicTitle = ultraSafeString(topic?.name) || 'Thema';
  const safeWeek = parseInt(week) || 0;

  try {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          style={{ 
            borderColor: '#3b82f640',
            width: `${modalWidth}px`,
            maxWidth: '90vw'
          }}
        >
          <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-white">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md bg-blue-600"
              >
                <BookOpen className="w-5 h-5 mr-1 text-white" />
              </div>
              {safeTopicTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Lektionen des Themas {topic?.name} in Woche {week}
            </DialogDescription>
            <div className="text-slate-500 dark:text-slate-400 text-sm">
              Woche {safeWeek} • {totalLessonCount} Lektion{totalLessonCount !== 1 ? 'en' : ''}
            </div>
          </DialogHeader>
          
          <div className="pt-4">
            <div 
              className="grid gap-2"
              style={{ 
                gridTemplateColumns: gridColumns.columns,
                minHeight: '80px'
              }}
            >
              {renderContent()}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600"
            >
              <X className="w-4 h-4 mr-2" />
              Schließen
            </Button>
          </div>
        </DialogContent>

        {isLessonModalOpen && (
          <LessonModal
            isOpen={isLessonModalOpen}
            onClose={() => {
              setIsLessonModalOpen(false);
              setEditingLesson(null);
            }}
            onSave={handleSave}
            onDelete={handleDelete}
            lesson={editingLesson}
            topics={Array.isArray(topics) ? topics : []}
            newLessonSlot={null}
            subjectColor={ultraSafeString(subjectColor)}
            allYearlyLessons={allYearlyLessons}
            currentWeek={safeWeek}
            currentYear={currentYear}
            onSaveAndNext={(nextLessonNumber) => {
              // Finde die nächste Lektion im gleichen Topic/Woche
              const nextLesson = safeTopicLessons.find(
                l => Number(l.lesson_number) === nextLessonNumber
              );

              if (nextLesson) {
                // Bereite die Lektion für das Modal vor
                const lessonToEdit = {
                  ...nextLesson,
                  topic: topic || null,
                  topic_id: nextLesson.topic_id || topic?.id || '',
                  color: topic?.color || subjectColor || '#3b82f6'
                };
                setEditingLesson(lessonToEdit);
              } else {
                // Keine weitere Lektion in diesem Topic → Modal schließen
                setIsLessonModalOpen(false);
                setEditingLesson(null);
              }
            }}
          />
        )}
      </Dialog>
    );
  } catch (renderError) {
    console.error('TopicLessonsModal render error:', renderError);
    return null;
  }
}