
import React from "react";
import { motion } from "framer-motion";
import { Clock, BookOpen } from "lucide-react";

export default function LessonOverviewPanel({
  items,
  selectedItem,
  onItemSelect,
  currentHoliday,
  customization,
  currentItem
}) {
  const getHolidayEmoji = (holiday) => {
    if (!holiday) return '📅';
    
    switch (holiday.type) {
      case 'vacation':
        if (holiday.name.includes('Sommer')) return '☀️';
        if (holiday.name.includes('Herbst')) return '🍂';
        if (holiday.name.includes('Weihnacht')) return '🎄';
        if (holiday.name.includes('Sport')) return '⛷️';
        if (holiday.name.includes('Frühling')) return '🌸';
        return '🏖️';
      case 'holiday':
        return '🎉';
      case 'training':
        return '📚';
      default:
        return '📅';
    }
  };

  const getHolidayColor = (holiday) => {
    if (!holiday) return 'bg-slate-500';
    
    switch (holiday.type) {
      case 'vacation':
        if (holiday.name.includes('Sommer')) return 'bg-yellow-500';
        if (holiday.name.includes('Herbst')) return 'bg-orange-500';
        if (holiday.name.includes('Weihnacht')) return 'bg-green-500';
        if (holiday.name.includes('Sport')) return 'bg-blue-500';
        if (holiday.name.includes('Frühling')) return 'bg-pink-500';
        return 'bg-cyan-500';
      case 'holiday':
        return 'bg-purple-500';
      case 'training':
        return 'bg-indigo-500';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden h-full flex flex-col">
      {/* Handle for dragging */}
      <div className="bg-slate-100 dark:bg-slate-700 p-3 cursor-default border-b border-slate-200 dark:border-slate-600">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className={`${customization.fontSize.content} font-bold text-slate-800 dark:text-slate-200`}>
            Tagesübersicht
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentHoliday ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${getHolidayColor(currentHoliday)} text-white p-6 rounded-xl text-center`}
          >
            <div className="text-6xl mb-4">{getHolidayEmoji(currentHoliday)}</div>
            <h3 className={`${customization.fontSize.title} font-bold mb-2`}>
              {currentHoliday.name}
            </h3>
            {items.length > 0 && (
              <div className="mt-4">
                <p className={`${customization.fontSize.content} opacity-90 mb-2`}>
                  Hinweis: Termine trotz Ferien/Feiertag:
                </p>
                <div className="space-y-1">
                  {items.map((item, index) => (
                    <div key={index} className="text-sm opacity-80">
                      {item.type === 'break' ? 
                        `${item.name} (${item.timeSlot.start} - ${item.timeSlot.end})` :
                        `${item.subject?.name || item.subject} - ${item.description}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {/* Die .map-Schleife rendert nun nur noch Lektionen. */}
            {items.map((lesson, index) => {
              const isSelected = selectedItem?.id === lesson.id;
              const isCurrent = currentItem?.type === 'lesson' && currentItem.id === lesson.id;
              const isPast = lesson.progress >= 100;
              
              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-4 rounded-xl cursor-pointer border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 shadow-lg scale-105' 
                      : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                  } ${
                    isPast ? 'opacity-60' : 'opacity-100'
                  } ${
                    isCurrent ? 'ring-2 ring-green-400 ring-opacity-75' : ''
                  }`}
                  style={{ 
                    backgroundColor: lesson.subject.color + '20',
                    borderColor: isSelected ? lesson.subject.color : undefined
                  }}
                  onClick={() => onItemSelect(lesson)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className={`${customization.fontSize.content} font-bold text-slate-800 dark:text-slate-200`}>
                        {lesson.subject.name || lesson.subject}
                        {isCurrent && (
                          <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                            Aktuell
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {lesson.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Periode {lesson.period_slot}
                      </div>
                      {lesson.is_double_lesson && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Doppellektion
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Time and Progress */}
                  {lesson.timeSlot && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.timeSlot.start} - {lesson.timeSlot.end}</span>
                      </div>
                      
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${lesson.progress}%`,
                            backgroundColor: lesson.subject.color 
                          }}
                        />
                      </div>
                      
                      <div className="text-xs text-slate-500 dark:text-slate-500 text-right">
                        {lesson.progress}% abgeschlossen
                      </div>
                    </div>
                  )}

                  {/* Additional lesson flags */}
                  <div className="flex gap-2 mt-2">
                    {lesson.is_exam && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs rounded-full">
                        Prüfung
                      </span>
                    )}
                    {lesson.is_allerlei && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                        Allerlei
                      </span>
                    )}
                    {lesson.is_half_class && (
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        Halbklasse
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-400`}>
              Keine Lektionen geplant
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
