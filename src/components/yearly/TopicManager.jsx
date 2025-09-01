import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Edit3, ChevronDown, CheckCircle, Circle, Book } from "lucide-react";
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
  yearlyLessons
}) {
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
        acc[lesson.topic_id]++;
      }
      return acc;
    }, {});
  }, [yearlyLessons]);

  return (
    <div className="bg-white dark:bg-slate-800 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 dark:border-slate-700 p-6 flex flex-col h-full max-h-[calc(100vh-3rem)]">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 tracking-tight">Planung</h3>
      <div className="space-y-4 mb-6">
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-slate-300">Klasse</label>
          <Select value={activeClassId || ''} onValueChange={onSelectClass}>
            <SelectTrigger className="bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white shadow-inner">
              <SelectValue placeholder="Klasse auswählen..." />
            </SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600 dark:text-slate-300">Fach</label>
          <Select value={activeSubjectName} onValueChange={onSelectSubject} disabled={!activeClassId}>
            <SelectTrigger className="bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white shadow-inner">
              <SelectValue placeholder="Fach auswählen..." />
            </SelectTrigger>
            <SelectContent>{subjectsForClass.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Themen</h4>
          <Button variant="ghost" size="icon" onClick={onAddTopic} className="text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-300" disabled={!activeSubjectName}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        <div className="mb-4">
            <Select value={activeTopicId || 'all'} onValueChange={handleTopicSelection}>
              <SelectTrigger className="bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-800 dark:text-white shadow-inner">
                <SelectValue placeholder="Thema auswählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Lektionen anzeigen</SelectItem>
                {filteredTopics.map(topic => (
                  <SelectItem key={topic.id} value={topic.id} style={{ color: topic.color }}>
                    <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: topic.color}}></div>
                        {topic.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {filteredTopics.map(topic => {
              const isSelected = activeTopicId === topic.id;
              const lessonCount = assignedLessonsByTopic[topic.id] || 0;
              
              return (
                <div
                  key={topic.id}
                  onClick={() => handleTopicSelection(isSelected ? null : topic.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-l-4 ${
                    isSelected
                      ? 'bg-blue-100/30 dark:bg-blue-600/30 shadow-md'
                      : 'bg-gray-100/50 dark:bg-slate-700/50 hover:bg-gray-200/50 dark:hover:bg-slate-600/50'
                  }`}
                  style={{ borderColor: topic.color }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 dark:text-white flex items-center">
                        {isSelected ? <CheckCircle className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> : <Circle className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-400" />}
                        {topic.name}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{lessonCount} Lektionen zugewiesen</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTopic(topic);
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}