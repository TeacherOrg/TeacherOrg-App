import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Edit3, ChevronDown, CheckCircle, Circle, Book, ChevronRight, ChevronLeft } from "lucide-react"; // ← ChevronUpDown entfernt
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TopicManager({
  topics,
  subjects,
  classes,
  activeClassId,
  onSelectClass,
  activeSubjectName,
  onSelectSubject,
  activeTopicId,
  onSelectTopic,
  onAddTopic,
  onEditTopic,
  yearlyLessons,
  isCompact = false
}) {
  const [isCollapsed, setIsCollapsed] = useState(isCompact);
  
  const subjectsForClass = useMemo(() => {
    if (!activeClassId) return [];
    return subjects.filter(s => s.class_id === activeClassId);
  }, [subjects, activeClassId]);

  const filteredTopics = useMemo(() => {
    return topics.filter(topic => topic.subject === activeSubjectName);
  }, [topics, activeSubjectName]);

  const handleTopicSelection = (topicId) => {
    onSelectTopic(topicId === 'all' ? null : topicId);
  };
  
  const assignedLessonsByTopic = useMemo(() => {
    return yearlyLessons.reduce((acc, lesson) => {
      if (lesson.topic_id) {
        if (!acc[lesson.topic_id]) {
          acc[lesson.topic_id] = 0;
        }
        // Doppellektionen zählen als 2 Unterrichtsstunden
        acc[lesson.topic_id] += lesson.is_double_lesson ? 2 : 1;
      }
      return acc;
    }, {});
  }, [yearlyLessons]);

  const toggleCollapse = () => {
    if (isCompact) {
      setIsCollapsed(!isCollapsed);
    }
  };

  if (isCompact && isCollapsed) {
    return (
      <div className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-4 h-24 flex items-center justify-center cursor-pointer group" onClick={toggleCollapse}>
        <div className="text-center">
          <Book className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2 transition-colors" />
          <h3 className="text-sm font-semibold text-gray-600 dark:text-slate-300">Planung</h3>
          <p className="text-xs text-gray-400">Klick zum Erweitern</p>
        </div>
      </div>
    );
  }

  const containerClasses = isCompact 
    ? "topic-manager-compact compact-sidebar bg-white dark:bg-slate-800 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-3" // ← p-3 statt p-4, + topic-manager-compact
    : "bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 flex flex-col h-full";

  const headerClasses = isCompact 
    ? "text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center justify-between" 
    : "text-xl font-bold text-gray-800 dark:text-white mb-6 tracking-tight";

  const spaceYClasses = isCompact ? "space-y-2 mb-4" : "space-y-4 mb-6";

  return (
    <div className={containerClasses}>
      {/* Header with collapse button */}
      <div className={`${headerClasses}`}>
        <h3>Planung</h3>
        {isCompact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="h-6 w-6 p-0"
          >
            {/* Alternative: ChevronRight/ChevronLeft für Expand/Collapse */}
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Controls Section */}
      {!isCollapsed && (
        <>
          <div className={spaceYClasses}>
            <div>
              <label className={`text-sm font-medium ${isCompact ? 'text-gray-600 dark:text-slate-300 block mb-1' : 'text-gray-600 dark:text-slate-300'}`}>
                Klasse
              </label>
              <Select value={activeClassId || ''} onValueChange={onSelectClass}>
                <SelectTrigger className={`bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white shadow-inner ${isCompact ? 'h-8 text-xs' : ''}`}>
                  <SelectValue placeholder="Klasse auswählen..." />
                </SelectTrigger>
                <SelectContent className={isCompact ? 'max-h-32' : ''}>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id} className={isCompact ? 'text-xs' : ''}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className={`text-sm font-medium ${isCompact ? 'text-gray-600 dark:text-slate-300 block mb-1' : 'text-gray-600 dark:text-slate-300'}`}>
                Fach
              </label>
              <Select value={activeSubjectName} onValueChange={onSelectSubject} disabled={!activeClassId}>
                <SelectTrigger className={`bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white shadow-inner ${isCompact ? 'h-8 text-xs' : ''}`}>
                  <SelectValue placeholder="Fach auswählen..." />
                </SelectTrigger>
                <SelectContent className={isCompact ? 'max-h-32' : ''}>
                  {subjectsForClass.map(s => (
                    <SelectItem key={s.id} value={s.name} className={isCompact ? 'text-xs' : ''}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Topics Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className={`flex justify-between items-center ${isCompact ? 'mb-2' : 'mb-4'}`}>
              <h4 className={`text-base ${isCompact ? 'text-sm' : 'text-lg'} font-semibold text-gray-800 dark:text-white`}>
                Themen
              </h4>
              <Button 
                variant="ghost" 
                size={isCompact ? "sm" : "icon"} 
                onClick={onAddTopic} 
                className={`text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-slate-700 ${isCompact ? 'h-6 w-6 p-0' : 'hover:text-blue-700 dark:hover:text-blue-300'}`} 
                disabled={!activeSubjectName}
              >
                <Plus className={`w-${isCompact ? '3 h-3' : '5 h-5'}`} />
              </Button>
            </div>

            {/* Topic Selector */}
            <div className={isCompact ? "mb-2" : "mb-4"}>
              <Select value={activeTopicId || 'all'} onValueChange={handleTopicSelection}>
                <SelectTrigger className={`bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white shadow-inner ${isCompact ? 'h-8 text-xs' : ''}`}>
                  <SelectValue placeholder="Thema auswählen..." />
                </SelectTrigger>
                <SelectContent className={isCompact ? 'max-h-32' : ''}>
                  <SelectItem value="all" className={isCompact ? 'text-xs' : ''}>Alle Lektionen anzeigen</SelectItem>
                  {filteredTopics.slice(0, isCompact ? 5 : 20).map(topic => (
                    <SelectItem key={topic.id} value={topic.id} className={isCompact ? 'text-xs' : ''}>
                      <div className="flex items-center">
                        <div className={`w-${isCompact ? '1.5 h-1.5' : '2 h-2'} rounded-full mr-2`} style={{backgroundColor: topic.color}}></div>
                        {topic.name}
                      </div>
                    </SelectItem>
                  ))}
                  {filteredTopics.length > (isCompact ? 5 : 20) && (
                    <SelectItem value="more" className={isCompact ? 'text-xs' : ''} disabled>
                      +{filteredTopics.length - (isCompact ? 5 : 20)} weitere...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Topics List */}
            <ScrollArea className={`flex-1 ${isCompact ? 'max-h-48' : ''}`}>
              <div className={`space-y-${isCompact ? '1 pr-2' : '2 pr-4'}`}>
                {filteredTopics.slice(0, isCompact ? 3 : 15).map(topic => {
                  const isSelected = activeTopicId === topic.id;
                  const lessonCount = assignedLessonsByTopic[topic.id] || 0;
                  
                  return (
                    <div
                      key={topic.id}
                      onClick={() => handleTopicSelection(isSelected ? null : topic.id)}
                      className={`p-${isCompact ? '2' : '3'} rounded-lg cursor-pointer transition-all duration-200 border-l-4 ${
                        isSelected
                          ? 'bg-blue-100/30 dark:bg-blue-600/30 shadow-md'
                          : 'bg-gray-100/50 dark:bg-slate-700/50 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'
                      }`}
                      style={{ borderColor: topic.color }}
                    >
                      <div className={`flex justify-between items-start ${isCompact ? 'gap-1' : 'gap-2'}`}>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-gray-800 dark:text-white flex items-center ${isCompact ? 'gap-1' : 'gap-2'}`}>
                            {isSelected ? (
                              <CheckCircle className={`w-${isCompact ? '3 h-3' : '4 h-4'} text-blue-600 dark:text-blue-400`} />
                            ) : (
                              <Circle className={`w-${isCompact ? '3 h-3' : '4 h-4'} text-gray-400 dark:text-slate-400`} />
                            )}
                            <span className={`truncate ${isCompact ? 'text-sm' : ''}`}>
                              {topic.name}
                            </span>
                          </div>
                          <p className={`text-xs ${isCompact ? 'text-[10px]' : ''} text-gray-500 dark:text-slate-400 mt-${isCompact ? '0' : '1'}`}>
                            {lessonCount} Lektionen
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size={isCompact ? "sm" : "icon"}
                          className={`w-${isCompact ? '5 h-5' : '7 h-7'} text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white ${isCompact ? 'p-0' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTopic(topic);
                          }}
                        >
                          <Edit3 className={`w-${isCompact ? '3 h-3' : '4 h-4'}`} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {filteredTopics.length > (isCompact ? 3 : 15) && (
                  <div className={`text-center py-2 ${isCompact ? 'text-[10px]' : 'text-sm'}`}>
                    <span className="text-gray-400 dark:text-slate-500">
                      +{filteredTopics.length - (isCompact ? 3 : 15)} weitere Themen...
                    </span>
                  </div>
                )}
                
                {filteredTopics.length === 0 && activeSubjectName && (
                  <div className={`text-center py-4 ${isCompact ? 'text-[10px]' : 'text-sm'}`}>
                    <span className="text-gray-400 dark:text-slate-500">
                      Noch keine Themen für {activeSubjectName}
                    </span>
                    <Button
                      variant="link"
                      size={isCompact ? "sm" : "default"}
                      onClick={onAddTopic}
                      className={`mt-1 h-auto p-0 ${isCompact ? 'text-xs' : ''}`}
                    >
                      Erstelle das erste Thema
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}