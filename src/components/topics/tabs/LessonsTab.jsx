// src/components/topics/tabs/LessonsTab.jsx
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BookOpen, ExternalLink } from "lucide-react";

const LessonCard = ({ lesson, onClick, color }) => (
  <div
    className="w-20 h-20 rounded-lg text-white flex items-center justify-center cursor-pointer hover:opacity-90 flex-shrink-0 text-sm font-medium shadow-md relative transition-all duration-200 hover:scale-105"
    style={{ backgroundColor: color || '#3b82f6' }}
    onClick={onClick}
  >
    {lesson.is_half_class && (
      <div className="absolute top-1 right-1 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        1/2
      </div>
    )}
    {lesson.is_exam && (
      <div className="absolute top-1 left-1 bg-red-500/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
        P
      </div>
    )}
    <div className="text-center">
      <div className="text-xs opacity-80">L{lesson.lesson_number}</div>
      <div className="text-[10px] opacity-70">W{lesson.week_number}</div>
    </div>
  </div>
);

export function LessonsTab({
  lessons = [],
  lessonsByWeek = {},
  sortedWeekNumbers = [],
  topicColor = '#3b82f6',
  onLessonClick,
  onNavigateToYearlyOverview,
  subjectName = ''
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs md:text-sm font-semibold text-slate-300">
            Zugewiesene Lektionen ({lessons.length})
          </Label>
        </div>

        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 border border-slate-700 rounded-lg p-3 bg-slate-800/50">
          {sortedWeekNumbers.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-500" />
              <p className="text-xs text-slate-400">
                Noch keine Lektionen zugewiesen.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Weisen Sie Lektionen in der Jahresübersicht zu.
              </p>
            </div>
          ) : (
            sortedWeekNumbers.map((weekNumber) => (
              <div key={weekNumber} className="space-y-2">
                <div className="text-xs font-semibold text-slate-400">
                  Woche {weekNumber}
                </div>
                <div className="flex flex-wrap gap-2">
                  {lessonsByWeek[weekNumber].map((lesson) => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      color={topicColor}
                      onClick={() => onLessonClick?.(lesson)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Zur Jahresübersicht navigieren */}
      {onNavigateToYearlyOverview && (
        <Button
          type="button"
          variant="outline"
          onClick={onNavigateToYearlyOverview}
          className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Zur Jahresübersicht ({subjectName})
        </Button>
      )}
    </div>
  );
}

export default LessonsTab;
