import React from "react";

const DAYS = [
  { key: "monday", label: "Montag", short: "Mo" },
  { key: "tuesday", label: "Dienstag", short: "Di" },
  { key: "wednesday", label: "Mittwoch", short: "Mi" },
  { key: "thursday", label: "Donnerstag", short: "Do" },
  { key: "friday", label: "Freitag", short: "Fr" }
];

// Helper function to get the date for a specific day in a given week
function getDateForWeekDay(weekNumber, dayIndex) {
  const currentYear = new Date().getFullYear();
  const baseDate = new Date(currentYear, 7, 15); // August 15th as approximate school year start
  
  // Calculate the Monday of the given school week
  const mondayOfWeek = new Date(baseDate);
  mondayOfWeek.setDate(baseDate.getDate() + (weekNumber - 1) * 7);
  
  // Get the specific day (0 = Monday, 1 = Tuesday, etc.)
  const targetDate = new Date(mondayOfWeek);
  targetDate.setDate(mondayOfWeek.getDate() + dayIndex);
  
  return targetDate;
}

export default function DayHeader({ day, currentWeek }) {
  const dayInfo = DAYS.find(d => d.key === day);
  const dayIndex = DAYS.findIndex(d => d.key === day);
  const date = currentWeek ? getDateForWeekDay(currentWeek, dayIndex) : null;
  
  const formatDate = (date) => {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="p-3 text-center bg-white dark:bg-slate-800">  
      <div className="font-bold text-gray-800 dark:text-slate-100 text-base">  
        {dayInfo?.short || day}
      </div>
      {date && (
        <div className="text-xs text-gray-600 dark:text-slate-400 mt-1">  
          ({formatDate(date)})
        </div>
      )}
    </div>
  );
}

export { DAYS };