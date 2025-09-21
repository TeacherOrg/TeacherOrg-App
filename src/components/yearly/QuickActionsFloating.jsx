import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, Book, GraduationCap, Settings } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function QuickActionsFloating({
  activeClassId,
  activeSubjectName,
  activeTopicId,
  classes,
  subjects,
  topics,
  onSelectClass,
  onSelectSubject,
  onSelectTopic,
  onAddTopic,
  onToggleQuickActions
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-lg border border-gray-200/80 dark:border-slate-700/80 shadow-lg">
      {/* Class Selector */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
            <GraduationCap className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" side="top" align="end">
          <Select value={activeClassId || ''} onValueChange={onSelectClass}>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Klasse" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PopoverContent>
      </Popover>

      {/* Subject Selector */}
      <Select value={activeSubjectName || ''} onValueChange={onSelectSubject}>
        <SelectTrigger className="w-24 h-8 flex-shrink-0">
          <SelectValue placeholder="Fach" />
        </SelectTrigger>
        <SelectContent>
          {subjects.map(s => (
            <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Topic Selector */}
      <Select value={activeTopicId || 'all'} onValueChange={onSelectTopic}>
        <SelectTrigger className="w-20 h-8 flex-shrink-0">
          <SelectValue placeholder={activeTopicId ? '🎨' : '📚'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle</SelectItem>
          {topics.slice(0, 8).map(topic => (
            <SelectItem key={topic.id} value={topic.id}>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: topic.color}}></div>
                {topic.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Add Topic Button */}
      <Button
        size="sm"
        onClick={onAddTopic}
        className="h-8 w-8 flex-shrink-0"
        variant="outline"
        disabled={!activeSubjectName}
      >
        <Plus className="h-4 w-4" />
      </Button>

      {/* Quick Actions Toggle */}
      <Button
        size="sm"
        onClick={onToggleQuickActions}
        className="h-8 w-8 flex-shrink-0 ml-auto"
        variant="outline"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}