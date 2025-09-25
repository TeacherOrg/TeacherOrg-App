import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Lesson, YearlyLesson, Subject, Holiday, Setting, Class, DailyNote, Announcement, Chore, ChoreAssignment, Student } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize, Settings, Calendar, Clock, Users, Home, Zap } from "lucide-react"; // Added Calendar, Clock, Users, Home, Zap
import { motion } from "framer-motion";
import CalendarLoader from "../components/ui/CalendarLoader";
import LessonOverviewPanel from "../components/daily/LessonOverviewPanel";
import LessonDetailPanel from "../components/daily/LessonDetailPanel";
import ClockPanel from "../components/daily/ClockPanel";
import CustomizationPanel from "../components/daily/CustomizationPanel";
import TeacherNotesPanel from "../components/daily/TeacherNotesPanel";
import AnnouncementsTicker from "../components/daily/AnnouncementsTicker";
import ChoresDisplay from "../components/daily/ChoresDisplay";
import { createPageUrl } from "@/utils"; // Added createPageUrl
import { getThemeGradient } from "@/utils/colorDailyUtils";
import { CustomizationSettings } from "@/api/entities"; // Neue Entity aus entities.js
import pb from "@/api/pb"; // Für authStore

// Utility functions
function getCurrentWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + start.getDay() + 1) / 7);
}

function getWeekInfo(week, year) {
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const monday = new Date(mondayOfWeek1);
  monday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  
  return {
    start: monday,
    week: week,
    year: monday.getFullYear()
  };
}

function generateTimeSlotsWithBreaks(settings) {
  if (!settings || !settings.startTime) return { timeSlots: [], breaks: [] };

  const slots = [];
  const breaks = [];
  const {
    startTime,
    lessonsPerDay = 8,
    lessonDuration = 45,
    shortBreak = 5,
    morningBreakAfter = 2,
    morningBreakDuration = 20,
    lunchBreakAfter = 4,
    lunchBreakDuration = 40,
    afternoonBreakAfter = 6,
    afternoonBreakDuration = 15,
  } = settings;

  const [startHour, startMinute] = startTime.split(':').map(Number);
  let currentTime = new Date(2000, 0, 1, startHour, startMinute, 0);

  for (let i = 1; i <= lessonsPerDay; i++) {
    const slotStartTime = new Date(currentTime);
    currentTime.setMinutes(currentTime.getMinutes() + lessonDuration);
    const slotEndTime = new Date(currentTime);

    slots.push({
      period: i,
      start: slotStartTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      end: slotEndTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    });

    if (i < lessonsPerDay) {
      let breakDuration = shortBreak;
      let breakType = 'short';
      let breakName = 'Kurze Pause';

      if (i === morningBreakAfter) {
          breakDuration = morningBreakDuration;
          breakType = 'morning';
          breakName = 'Morgenpause';
      } else if (i === lunchBreakAfter) {
          breakDuration = lunchBreakDuration;
          breakType = 'lunch';
          breakName = 'Mittagspause';
      } else if (i === afternoonBreakAfter) {
          breakDuration = afternoonBreakDuration;
          breakType = 'afternoon';
          breakName = 'Nachmittagspause';
      }
      
      const breakStartTime = new Date(currentTime);
      currentTime.setMinutes(currentTime.getMinutes() + breakDuration);
      const breakEndTime = new Date(currentTime);

      breaks.push({
          type: breakType,
          name: breakName,
          timeSlot: {
            start: breakStartTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
            end: breakEndTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
          }
      });
    }
  }

  return { timeSlots: slots, breaks };
}

export default function DailyView({ currentDate, onDateChange }) {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCustomization, setShowCustomization] = useState(false);
  const audioRef = useRef(null);
  
  // Data states
  const [allLessons, setAllLessons] = useState([]);
  const [yearlyLessons, setYearlyLessons] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [settings, setSettings] = useState({});
  const [classes, setClasses] = useState([]);
  const [chores, setChores] = useState([]);
  const [choreAssignments, setChoreAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]); // Added announcements state

  // New feature states
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [manualStepIndex, setManualStepIndex] = useState(null);
  const [showChoresView, setShowChoresView] = useState(false);
  
  // Customization settings
  const [customization, setCustomization] = useState({
    fontSize: { title: 'text-2xl', content: 'text-lg', clock: 'text-4xl' },
    background: { type: 'gradient', value: 'from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800' },
    theme: 'default',
    autoFocusCurrentLesson: true,
    showOverview: true,
    showNotes: true,
    showClock: true,
    audio: { enabled: false, volume: 0.5 }
  });

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Calculate current week and day info
  const currentWeek = useMemo(() => getCurrentWeek(), []);
  const weekInfo = useMemo(() => getWeekInfo(currentWeek, currentDate.getFullYear()), [currentWeek, currentDate]);
  const { timeSlots, breaks } = useMemo(() => generateTimeSlotsWithBreaks(settings), [settings]);
  
  const dayOfWeek = useMemo(() => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[currentDate.getDay()];
  }, [currentDate]);

  const dayName = useMemo(() => {
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return dayNames[currentDate.getDay()];
  }, [currentDate]);

  // Light/Dark Mode detection
  const isDark = document.documentElement.classList.contains('dark');

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    const loadCustomization = async () => {
      try {
        const userId = pb.authStore.model?.id;
        if (!userId) return;

        const settings = await CustomizationSettings.list({ filter: `user_id = "${userId}"` });
        if (settings && settings.length > 0) {
          const loaded = settings[0];
          setCustomization({
            theme: loaded.theme || 'default',
            background: {
              type: loaded.background_type,
              value: loaded.background_value,
            },
            fontSize: {
              title: loaded.font_size_title,
              content: loaded.font_size_content,
              clock: loaded.font_size_clock,
            },
            showOverview: loaded.show_overview,
            showNotes: loaded.show_notes,
            showClock: loaded.show_clock,
            auto_focus_current_lesson: loaded.auto_focus_current_lesson,
            compactMode: loaded.compact_mode,
            audio: {
              enabled: loaded.audio_enabled,
              volume: loaded.audio_volume,
            },
          });
        }
      } catch (error) {
        console.error("Error loading customization:", error);
      }
    };
    loadCustomization();
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Save customization settings to localStorage
  useEffect(() => {
    const saveCustomization = async () => {
      try {
        const userId = pb.authStore.model?.id;
        if (!userId) return;

        const settings = await CustomizationSettings.list({ filter: `user_id = "${userId}"` });
        const data = {
          user_id: userId,
          theme: customization.theme,
          background_type: customization.background.type,
          background_value: customization.background.value,
          font_size_title: customization.fontSize.title,
          font_size_content: customization.fontSize.content,
          font_size_clock: customization.fontSize.clock,
          show_overview: customization.showOverview,
          show_notes: customization.showNotes,
          show_clock: customization.showClock,
          auto_focus_current_lesson: customization.autoFocusCurrentLesson,
          compact_mode: customization.compactMode,
          audio_enabled: customization.audio.enabled,
          audio_volume: customization.audio.volume,
        };

        if (settings && settings.length > 0) {
          await CustomizationSettings.update(settings[0].id, data);
        } else {
          await CustomizationSettings.create(data);
        }
      } catch (error) {
        console.error("Error saving customization:", error);
      }
    };
    saveCustomization();
  }, [customization]);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [lessonsData, yearlyLessonsData, subjectsData, holidaysData, settingsData, classesData, choresData, assignmentsData, announcementsData] = await Promise.all([
        Lesson.list(),
        YearlyLesson.list(),
        Subject.list(),
        Holiday.list(),
        Setting.list(),
        Class.list(),
        Chore.list(),
        ChoreAssignment.list(),
        Announcement.list() // Added Announcement.list()
      ]);
      
      setAllLessons(lessonsData || []);
      setYearlyLessons(yearlyLessonsData || []);
      setSubjects(subjectsData || []);
      setHolidays(holidaysData || []);
      setClasses(classesData || []);
      setChores(choresData || []);
      setChoreAssignments(assignmentsData || []);
      setAnnouncements(announcementsData || []); // Set announcements state
      
      if (settingsData && settingsData.length > 0) {
        setSettings(settingsData[0]);
      } else {
        const defaultSettings = { startTime: "08:00", lessonsPerDay: 8, lessonDuration: 45, shortBreak: 5, morningBreakAfter: 2, morningBreakDuration: 20, lunchBreakAfter: 4, lunchBreakDuration: 40, afternoonBreakAfter: 6, afternoonBreakDuration: 15 };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize calculateProgress function as it is used in lessonsForDate memoization
  const calculateProgress = useCallback((startTime, endTime) => {
    const now = new Date();
    const today = now.toDateString();
    const selectedDay = currentDate.toDateString();
    
    // Only calculate progress for today
    if (today !== selectedDay) return 0;
    
    const start = new Date(`${today} ${startTime}`);
    const end = new Date(`${today} ${endTime}`);
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  }, [currentDate]);

  // Get lessons for the selected date
  const lessonsForDate = useMemo(() => {
    if (!dayOfWeek || dayOfWeek === 'sunday' || dayOfWeek === 'saturday') return [];
    
    const lessonsForDay = allLessons.filter(lesson => 
      lesson.day_of_week === dayOfWeek && 
      lesson.week_number === currentWeek
    );

    return lessonsForDay.map(lesson => {
      const yearlyLesson = lesson.yearly_lesson_id ? 
        yearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id) : null;
      const secondYearlyLesson = lesson.second_yearly_lesson_id ? 
        yearlyLessons.find(yl => yl.id === lesson.second_yearly_lesson_id) : null;
      const subject = subjects.find(s => s.id === lesson.subject); // Fix: Match by ID instead of name

      const timeSlot = timeSlots.find(ts => ts.period === lesson.period_slot);

      let steps = [];
      let description = '';
      
      if (lesson.is_double_lesson && yearlyLesson && secondYearlyLesson) {
        steps = [...(yearlyLesson.steps || []), ...(secondYearlyLesson.steps || [])];
        description = `${yearlyLesson.notes || ''} + ${secondYearlyLesson.notes || ''}`.trim();
      } else if (yearlyLesson) {
        steps = yearlyLesson.steps || [];
        description = yearlyLesson.notes || `Lektion ${yearlyLesson.lesson_number}`;
      } else {
        steps = lesson.steps || [];
        description = lesson.description || 'Keine Beschreibung';
      }

      // Add unique IDs to steps if they don't have one
      steps = steps.map((step, index) => ({ ...step, id: step.id || `${lesson.id}-step-${index}` }));

      return {
        ...lesson,
        type: 'lesson',
        yearlyLesson,
        secondYearlyLesson,
        subject: subject ? {
          ...subject,
          name: subject.name || lesson.subject_name || 'Unbekannt', // Fallback to normalized subject_name
          color: subject.color || '#3b82f6'
        } : { name: lesson.subject_name || 'Unbekannt', color: '#3b82f6' },
        timeSlot,
        steps,
        description,
        progress: timeSlot ? calculateProgress(timeSlot.start, timeSlot.end) : 0
      };
    }).sort((a, b) => a.period_slot - b.period_slot);
  }, [allLessons, yearlyLessons, subjects, timeSlots, dayOfWeek, currentWeek, calculateProgress]);
  
  // Create a combined schedule of lessons and breaks for the current item logic
  const combinedSchedule = useMemo(() => {
    const combined = [...lessonsForDate, ...breaks.map(b => ({...b, type: 'break'}))];
    return combined.sort((a, b) => {
        const timeA = a.timeSlot.start.split(':').map(Number);
        const timeB = b.timeSlot.start.split(':').map(Number);
        if (timeA[0] !== timeB[0]) {
            return timeA[0] - timeB[0];
        }
        return timeA[1] - timeB[1];
    });
  }, [lessonsForDate, breaks]);

  // Check if current date is a holiday
  const currentHoliday = useMemo(() => {
    const currentDateObj = new Date(currentDate);
    currentDateObj.setHours(0, 0, 0, 0);
    
    return holidays.find(holiday => {
      const startDate = new Date(holiday.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(holiday.end_date);
      endDate.setHours(23, 59, 59, 999);
      
      return currentDateObj >= startDate && currentDateObj <= endDate;
    });
  }, [holidays, currentDate]);

  // Get current item (lesson or break) based on time
  const currentItem = useMemo(() => {
    if (!combinedSchedule.length) return null;
    
    const now = new Date();
    const todayDate = new Date().toDateString();
    const selectedDateString = currentDate.toDateString();
    
    // Only show current item if viewing today
    if (todayDate !== selectedDateString) return null;
    
    return combinedSchedule.find(item => {
      if (!item.timeSlot) return false;
      
      const itemStart = new Date(`${now.toDateString()} ${item.timeSlot.start}`);
      const itemEnd = new Date(`${now.toDateString()} ${item.timeSlot.end}`);
      
      return now >= itemStart && now <= itemEnd;
    });
  }, [combinedSchedule, currentDate, currentTime]);

  // Find the next lesson that comes after the current break
  const nextLessonAfterPause = useMemo(() => {
    if (currentItem?.type !== 'break') return null;

    const currentBreakIndex = combinedSchedule.findIndex(item => item === currentItem);
    return combinedSchedule.find((item, index) => index > currentBreakIndex && item.type === 'lesson');
  }, [currentItem, combinedSchedule]);

  const todaysAssignments = useMemo(() => {
      const todayString = currentDate.toISOString().split('T')[0];
      return choreAssignments.filter(a => a.assignment_date === todayString);
  }, [choreAssignments, currentDate]);

  // Effect to check if chores view should be shown
  useEffect(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const selectedDay = new Date(currentDate);
    selectedDay.setHours(0,0,0,0);

    if (today.toDateString() !== selectedDay.toDateString() || lessonsForDate.length === 0) {
        setShowChoresView(false);
        return;
    }

    const lastLesson = lessonsForDate.sort((a,b) => a.period_slot - b.period_slot)[lessonsForDate.length - 1];
    if (lastLesson && lastLesson.timeSlot) {
        const lastLessonEnd = new Date(`${currentTime.toDateString()} ${lastLesson.timeSlot.end}`);
        if (currentTime > lastLessonEnd) {
            setShowChoresView(true);
        } else {
            setShowChoresView(false);
        }
    } else {
      setShowChoresView(false);
    }
  }, [currentTime, lessonsForDate, currentDate]);


  // Play audio at the end of a lesson
  useEffect(() => {
      if (customization.audio?.enabled && audioRef.current && currentItem?.type === 'lesson') {
          const now = new Date();
          const lessonEndTime = new Date(`${now.toDateString()} ${currentItem.timeSlot.end}`);
          const secondsToEnd = (lessonEndTime.getTime() - now.getTime()) / 1000;

          // Play sound 1 second before end
          if (secondsToEnd > 0 && secondsToEnd < 1.5) { 
              audioRef.current.volume = customization.audio.volume || 0.5;
              audioRef.current.play().catch(e => console.error("Audio play failed:", e));
          }
      }
  }, [currentTime, currentItem, customization.audio]);

  // Auto-focus current lesson/item if enabled
  useEffect(() => {
    if (customization.autoFocusCurrentLesson && currentItem && currentItem.type === 'lesson' && currentItem !== selectedItem) {
      setSelectedItem(currentItem);
    }
  }, [currentItem, customization.autoFocusCurrentLesson, selectedItem]);
  
  const handleItemSelect = useCallback((item) => {
      if(item.type === 'lesson') {
        setSelectedItem(item);
        setCompletedSteps(new Set());
        setManualStepIndex(null);
      }
  }, []);

  const handleStepCompleteChange = useCallback((stepId) => {
      setCompletedSteps(prev => {
          const newSet = new Set(prev);
          if (newSet.has(stepId)) {
              newSet.delete(stepId);
          } else {
              newSet.add(stepId);
          }
          return newSet;
      });
  }, []);
  
  const handleManualStepChange = useCallback((index) => {
      setManualStepIndex(index);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error('Fullscreen error:', err));
    } else {
      document.exitFullscreen();
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getBackgroundStyle = () => {
    const { background, theme } = customization;
    const baseColor = background.value || '#ffffff';
    const gradient = getThemeGradient(theme, baseColor, undefined, isDark);
    
    switch (background.type) {
      case 'solid':
        return { backgroundColor: baseColor };
      case 'image':
        return {
          backgroundImage: `url(${background.value})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        };
      case 'gradient':
        return { background: gradient };
      default:
        return { background: getThemeGradient('default', baseColor, undefined, isDark) }; // Fallback zu default Theme
    }
  };

  const mainGridStyle = useMemo(() => {
    const columns = [
      customization.showOverview ? 'minmax(0, 1fr)' : '',
      '2fr',
      customization.showNotes ? 'minmax(0, 1fr)' : ''
    ].filter(Boolean).join(' ');

    return { gridTemplateColumns: columns };
  }, [customization.showOverview, customization.showNotes]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  return (
    <motion.div 
      className={`h-screen w-screen overflow-hidden relative text-slate-800 dark:text-slate-200 font-[Poppins] ${
        customization.background.type === 'gradient' ? `bg-gradient-to-br ${customization.background.value}` :
        (customization.background.type === 'solid' || customization.background.type === 'image' ? '' : 'bg-slate-100 dark:bg-slate-900')
      }`}
      style={customization.background.type !== 'gradient' ? getBackgroundStyle() : {}}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <audio ref={audioRef} src="/audio/end_of_lesson.ogg" preload="auto" />
      
      {/* Announcements Ticker - Moved to top as per outline */}
      <AnnouncementsTicker announcements={announcements} />
      
      {/* Settings & Fullscreen buttons top-right */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowCustomization(!showCustomization)}
          className="rounded-xl"
        >
          <Settings className="w-4 h-4" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={toggleFullscreen}
          className="rounded-xl"
        >
          <Maximize className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div 
        className="p-4 h-full w-full grid gap-4"
        style={mainGridStyle}
      >
        {/* Lesson Overview Panel */}
        {customization.showOverview && (
          <motion.div 
            className="h-full overflow-hidden"
            drag // Verschiebbar via framer-motion
            dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
            whileDrag={{ scale: 0.95 }}
          >
            <LessonOverviewPanel
              items={lessonsForDate}
              selectedItem={selectedItem}
              onItemSelect={handleItemSelect}
              currentHoliday={currentHoliday}
              customization={customization}
              currentItem={currentItem}
              theme={customization.theme}
              isDark={isDark}
            />
          </motion.div>
        )}

        {/* Main Central Panel */}
        <div className="h-full overflow-hidden">
          {showChoresView ? (
            <ChoresDisplay assignments={todaysAssignments} chores={chores} students={students} customization={customization} />
          ) : selectedItem ? (
            <LessonDetailPanel
              lesson={selectedItem}
              currentItem={currentItem}
              nextLesson={nextLessonAfterPause}
              customization={customization}
              currentTime={currentTime}
              selectedDate={currentDate}
              completedSteps={completedSteps}
              onStepCompleteChange={handleStepCompleteChange}
              manualStepIndex={manualStepIndex}
              onManualStepChange={handleManualStepChange}
            />
          ) : (
             <div className="flex items-center justify-center h-full text-center bg-white/50 dark:bg-slate-800/50 rounded-2xl">
              <div>
                <div className="text-6xl mb-4">👈</div>
                <h2 className={`${customization.fontSize.title} font-bold text-slate-600 dark:text-slate-400 mb-2 font-[Inter]`}>
                  Kein Element ausgewählt
                </h2>
                <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-500 font-[Poppins]`}>
                  Wählen Sie eine Lektion aus der Übersicht, um Details anzuzeigen.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Teacher Notes Panel - Conditionally rendered */}
        {customization.showNotes && (
             <motion.div 
               className="h-full overflow-hidden"
               drag // Verschiebbar
               dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
               whileDrag={{ scale: 0.95 }}
             >
                <TeacherNotesPanel selectedDate={currentDate} customization={customization} />
            </motion.div>
        )}
      </div>

      {/* Clock Panel - Positioned top-right relative to root div */}
      {customization.showClock && (
        <motion.div 
          className="absolute top-24 right-4 z-30 w-[220px] h-[120px]"
          drag // Verschiebbar
          dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
          whileDrag={{ scale: 0.95 }}
        >
           <ClockPanel
              currentTime={currentTime}
              customization={customization}
            />
        </motion.div>
      )}

      {/* Customization Panel */}
      {showCustomization && (
        <motion.div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CustomizationPanel
              customization={customization}
              onCustomizationChange={setCustomization}
              onClose={() => setShowCustomization(false)}
            />
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!currentHoliday && lessonsForDate.length === 0 && !isLoading && !showChoresView && (
          <motion.div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className={`${customization.fontSize.title} font-bold text-slate-600 dark:text-slate-400 mb-2 font-[Inter]`}>
                Keine Lektionen geplant
              </h2>
              <p className={`${customization.fontSize.content} text-slate-500 dark:text-slate-500 font-[Poppins]`}>
                Für {dayName}, {formatDate(currentDate)} sind keine Lektionen eingetragen.
              </p>
            </div>
          </motion.div>
      )}
    </motion.div>
  );
}