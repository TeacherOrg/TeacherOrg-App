import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

const TimetableHeader = ({
  currentView, setCurrentView, handleViewChange,
  currentWeek, setCurrentWeek, currentYear, setCurrentYear, weekInfo,
  currentDate, setCurrentDate, handlePrevWeek, handleNextWeek, handlePrevDay, handleNextDay,
  isSpaceTheme = false
}) => {
  const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayName = dayNames[currentDate.getDay()];
  const formatDate = (date) => date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Space-Theme Styles
  const viewContainerClass = isSpaceTheme
    ? 'bg-transparent border-purple-500/30'
    : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-lg';

  const navContainerClass = isSpaceTheme
    ? 'bg-transparent'
    : 'bg-white/60 dark:bg-slate-800/60';

  const buttonHoverClass = isSpaceTheme
    ? 'hover:bg-purple-500/20 text-slate-200'
    : 'hover:bg-gray-200 dark:hover:bg-slate-600';

  const textClass = isSpaceTheme
    ? 'text-slate-200'
    : 'text-gray-800 dark:text-slate-200';

  const subTextClass = isSpaceTheme
    ? 'text-slate-400'
    : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="flex flex-col items-center p-4">
      <div className="flex items-center space-x-4 mb-4">
        <div className={`flex space-x-4 p-2 backdrop-blur-md rounded-lg border ${viewContainerClass}`}>
          {['Tag', 'Woche', 'Jahr'].map((view) => (
            <Button
              key={view}
              variant={currentView === view ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange(view)}
              className={`view-button-${view.toLowerCase()} px-4 py-2 rounded-lg transition-all duration-200 ${
                currentView === view
                  ? isSpaceTheme
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-inner shadow-purple-500/50'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-inner'
                  : isSpaceTheme
                    ? 'text-slate-300 hover:bg-purple-500/20 hover:text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md'
              }`}
            >
              {view}
            </Button>
          ))}
        </div>
      </div>
      <div className={`flex items-center space-x-4 my-4 p-2 backdrop-blur-sm rounded-lg ${navContainerClass}`}>
        {currentView === 'Woche' ? (
          <>
            <Button variant="ghost" onClick={handlePrevWeek} className={`rounded-lg ${buttonHoverClass}`}>
              <ChevronsLeft />
            </Button>
            <h2 className={`text-xl font-bold ${textClass}`}>
              Woche {weekInfo.calendarWeek}
              <span className={`text-sm ml-2 ${subTextClass}`}>
                {weekInfo.mondayStr} - {weekInfo.fridayStr}
              </span>
            </h2>
            <Button variant="ghost" onClick={handleNextWeek} className={`rounded-lg ${buttonHoverClass}`}>
              <ChevronsRight />
            </Button>
          </>
        ) : currentView === 'Tag' ? (
          <>
            <Button variant="ghost" onClick={handlePrevDay} className={`rounded-lg ${buttonHoverClass}`}>
              <ChevronsLeft />
            </Button>
            <h2 className={`text-xl font-bold ${textClass}`}>
              {dayName}, {formatDate(currentDate)}
            </h2>
            <Button variant="ghost" onClick={handleNextDay} className={`rounded-lg ${buttonHoverClass}`}>
              <ChevronsRight />
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TimetableHeader;