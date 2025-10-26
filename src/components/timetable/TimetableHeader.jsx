import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

const TimetableHeader = ({
  currentView, setCurrentView, handleViewChange,
  currentWeek, setCurrentWeek, currentYear, setCurrentYear, weekInfo,
  currentDate, setCurrentDate, handlePrevWeek, handleNextWeek, handlePrevDay, handleNextDay
}) => {
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayName = dayNames[currentDate.getDay()];
  const formatDate = (date) => date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="flex flex-col items-center p-4 shadow-lg">
      <div className="flex space-x-4 mb-4 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg">
        {['Tag', 'Woche', 'Jahr'].map((view) => (
          <Button
            key={view}
            variant={currentView === view ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleViewChange(view)}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${currentView === view ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-inner' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md'}`}
          >
            {view}
          </Button>
        ))}
      </div>
      <div className="flex items-center space-x-4 my-4 p-2 bg-gray-100 dark:bg-slate-700 rounded-lg shadow-md">
        {currentView === 'Woche' ? (
          <>
            <Button variant="ghost" onClick={handlePrevWeek} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
              <ChevronsLeft />
            </Button>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
              Woche {weekInfo.calendarWeek}
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                {weekInfo.mondayStr} - {weekInfo.fridayStr}
              </span>
            </h2>
            <Button variant="ghost" onClick={handleNextWeek} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
              <ChevronsRight />
            </Button>
          </>
        ) : currentView === 'Tag' ? (
          <>
            <Button variant="ghost" onClick={handlePrevDay} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
              <ChevronsLeft />
            </Button>
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">
              {dayName}, {formatDate(currentDate)}
            </h2>
            <Button variant="ghost" onClick={handleNextDay} className="rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600">
              <ChevronsRight />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TimetableHeader;