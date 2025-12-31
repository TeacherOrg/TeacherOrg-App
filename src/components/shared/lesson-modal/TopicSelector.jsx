import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Topic selector dropdown for lessons.
 * Filters topics by subject and allows "no topic" selection.
 *
 * @param {Object} props
 * @param {string} props.value - Currently selected topic ID
 * @param {Function} props.onChange - Handler for topic change
 * @param {Array} props.topics - Available topics for the subject
 * @param {boolean} [props.disabled] - Whether the selector is disabled
 * @param {string} [props.label] - Label text (defaults to "Thema")
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.className] - Additional CSS classes
 */
export function TopicSelector({
  value,
  onChange,
  topics = [],
  disabled = false,
  label = 'Thema',
  placeholder = 'Thema auswählen (optional)',
  className = ''
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-semibold text-slate-900 dark:text-white">
        {label}
      </Label>
      <Select
        value={value || 'no_topic'}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="no_topic">Kein Thema</SelectItem>
          {topics.map((topic) => (
            <SelectItem key={topic.id} value={topic.id}>
              {topic.title || topic.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default TopicSelector;
