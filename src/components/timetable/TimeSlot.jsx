import React from 'react';

const TimeSlot = ({ period, start, end }) => (
  <div className="text-center p-2">
    <div className="font-bold text-sm text-gray-800 dark:text-slate-200">  
      {start} - {end}
    </div>
  </div>
);

export default TimeSlot;

// Keep backward compatibility
export const TIME_SLOTS = [
  { period: 1, start: "08:00", end: "08:45" },
  { period: 2, start: "08:45", end: "09:30" },
  { period: 3, start: "09:50", end: "10:35" },
  { period: 4, start: "10:35", end: "11:20" },
  { period: 5, start: "12:00", end: "12:45" },
  { period: 6, start: "12:45", end: "13:30" },
  { period: 7, start: "13:30", end: "14:15" },
  { period: 8, start: "14:15", end: "15:00" },
];