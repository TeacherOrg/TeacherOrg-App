import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Lesson, YearlyLesson, Subject, Holiday, Setting, Class, Announcement, Chore, ChoreAssignment, Student, Topic, AllerleiLesson } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Users, Home, Zap, Coffee } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CalendarLoader from "../components/ui/CalendarLoader";
import LessonOverviewPanel from "../components/daily/LessonOverviewPanel";
import LessonDetailPanel from "../components/daily/LessonDetailPanel";
import ChoresDisplay from "../components/daily/ChoresDisplay";
import CustomizationPanel from "../components/daily/CustomizationPanel";
import { createPageUrl } from "@/utils";
import { normalizeAllerleiData } from "@/components/timetable/allerlei/AllerleiUtils";
import { CustomizationSettings } from "@/api/entities";
import pb from "@/api/pb";
import { useLessonStore, useAllerleiLessons } from "@/store";
import toast from "react-hot-toast";
import { playSound } from "@/utils/audioSounds";
import { useTour } from "@/components/onboarding/TourProvider";
import { emitTourEvent, TOUR_EVENTS } from "@/components/onboarding/tours/tourEvents";

// Utility functions
function getCurrentWeek(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
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

export default function DailyView({ currentDate, onDateChange, onThemeChange }) {
  const navigate = useNavigate();
  const { activeTour } = useTour();
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
  const [announcements, setAnnouncements] = useState([]);
  const [topics, setTopics] = useState([]);

  // Store setters
  const { setAllYearlyLessons, setAllerleiLessons } = useLessonStore();
  const allAllerleiLessons = useAllerleiLessons(); // ← korrekter Selector

  // New feature states
  const [manualStepIndex, setManualStepIndex] = useState(null);
  const [showChoresView, setShowChoresView] = useState(false);
  const [manualChoresView, setManualChoresView] = useState(false);
  // Temporärer Pausen-Button-State
  const [forcePauseView, setForcePauseView] = useState(false);

  // Customization Panel State
  const [showCustomization, setShowCustomization] = useState(false);

  // Customization settings
  const [customization, setCustomization] = useState({
    fontSize: { title: 'text-xl', content: 'text-xl', steps: 'text-base' },
    background: { type: 'gradient', value: 'from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800' },
    theme: 'default', // Fallback auf 'default'
    autoFocusCurrentLesson: true,
    showOverview: true,
    audio: {
      volume: 0.5,
      lessonEndEnabled: false,
      lessonEndSound: 'chime',
      lessonStartEnabled: false,
      lessonStartSound: 'bell',
      stepEndEnabled: false,
      stepEndSound: 'ping',
    },
    transparencyMode: false,
    forceDarkText: false,
    forceLightText: false,
    reducedMotion: false,
  });

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Track which step sounds have already been played (persists across view changes)
  const [playedStepSounds, setPlayedStepSounds] = useState(new Set());

  // Calculate current week and day info
  const currentWeek = useMemo(() => getCurrentWeek(currentDate), [currentDate]);
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
              steps: loaded.font_size_steps || 'text-base',
            },
            showOverview: loaded.show_overview,
            autoFocusCurrentLesson: loaded.auto_focus_current_lesson,
            compactMode: loaded.compact_mode,
            reducedMotion: loaded.reduced_motion || false,
            audio: {
              volume: loaded.audio_volume,
              lessonEndEnabled: loaded.audio_lesson_end_enabled || loaded.audio_enabled || false, // Fallback für alte Daten
              lessonEndSound: loaded.audio_lesson_end_sound || loaded.audio_sound || 'chime', // Fallback für alte Daten
              lessonStartEnabled: loaded.audio_lesson_start_enabled || false,
              lessonStartSound: loaded.audio_lesson_start_sound || 'bell',
              stepEndEnabled: loaded.audio_step_end_enabled || false,
              stepEndSound: loaded.audio_step_end_sound || 'ping',
            },
            transparencyMode: loaded.transparency_mode || false,
            forceDarkText: loaded.force_dark_text || false,
            forceLightText: loaded.force_light_text || false,
          });
        }
      } catch (error) {
        console.error("Error loading customization:", error);
      }
    };
    loadCustomization();
  }, []);

  // Update current time every second for smooth timer display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // User-ID für Filterung - nur eigene Daten laden
      const userId = pb.authStore.model?.id;
      if (!userId) {
        console.error("[DailyView] Kein authentifizierter User gefunden");
        setIsLoading(false);
        return;
      }

      const [lessonsData, yearlyLessonsData, subjectsData, holidaysData, settingsData, classesData, choresData, assignmentsData, announcementsData, studentsData, topicsData, allerleiLessonsData] = await Promise.all([
        Lesson.list({ user_id: userId }),
        YearlyLesson.list({ user_id: userId }),
        Subject.list(),  // Hat bereits internen User-Filter in entities.js
        Holiday.list({ user_id: userId }),
        Setting.list({ user_id: userId }),
        Class.list({ user_id: userId }),
        Chore.list({ user_id: userId }),
        ChoreAssignment.list({ user_id: userId }),
        Announcement.list({ user_id: userId }),
        Student.list({ user_id: userId }),
        Topic.list({ user_id: userId }),
        AllerleiLesson.list({ user_id: userId })
      ]);
      
      setAllLessons(lessonsData || []);
      setYearlyLessons(yearlyLessonsData || []);
      setSubjects(subjectsData || []);
      setHolidays(holidaysData || []);
      setClasses(classesData || []);
      setChores(choresData || []);
      setChoreAssignments(assignmentsData || []);
      setStudents(studentsData || []);
      setAnnouncements(announcementsData || []);
      setTopics(topicsData || []);
      setAllerleiLessons(allerleiLessonsData || []); // ← NEU: Allerlei-Lektionen in Store speichern

      // Debug: Logge die geladenen Subjects
      console.log("Debug: Loaded Subjects", subjectsData?.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color
      })));

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

  // Memoize calculateProgress function - uses currentTime state for real-time updates
  const calculateProgress = useCallback((startTime, endTime) => {
    const now = currentTime; // Use state instead of new Date() for reactive updates
    const today = now.toDateString();
    const selectedDay = currentDate.toDateString();

    if (today !== selectedDay) return 0;

    const start = new Date(`${today} ${startTime}`);
    const end = new Date(`${today} ${endTime}`);

    if (now < start) return 0;
    if (now > end) return 100;

    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  }, [currentDate, currentTime]);

  // Get lessons for the selected date
  const lessonsForDate = useMemo(() => {
    if (!dayOfWeek || dayOfWeek === 'sunday' || dayOfWeek === 'saturday') return [];
    
    // Normale Lektionen - OHNE Slave-Lektionen (bei Doppellektionen)
    const normalLessons = allLessons.filter(lesson =>
      lesson.day_of_week === dayOfWeek &&
      lesson.week_number === currentWeek &&
      !lesson.double_master_id  // Slave-Lessons ausblenden (Master zeigt beide)
    );

    // Allerlei-Lektionen (separat gespeichert)
    const allerleiLessons = allAllerleiLessons.filter(allerlei => 
      allerlei.day_of_week === dayOfWeek && 
      allerlei.week_number === currentWeek
    );

    // Kombiniere beide
    const lessonsForDay = [...normalLessons, ...allerleiLessons];

    console.log("Debug: Subjects in DailyView", subjects); // Debug subjects
    console.log("Debug: Lessons for date", lessonsForDay.length, "lessons found");
    console.log("Debug: Current week", currentWeek, "dayOfWeek", dayOfWeek);

    // Debug: Logge die ersten paar Lessons mit ihren Subject-IDs
    lessonsForDay.slice(0, 3).forEach(lesson => {
      console.log("Debug: Lesson subject mapping", {
        lessonId: lesson.id,
        subjectId: lesson.subject,
        subjectName: lesson.subject_name
      });
    });

    return lessonsForDay.map(lesson => {
      const yearlyLesson = lesson.yearly_lesson_id ? 
        yearlyLessons.find(yl => yl.id === lesson.yearly_lesson_id) : null;
      const secondYearlyLesson = lesson.second_yearly_lesson_id ? 
        yearlyLessons.find(yl => yl.id === lesson.second_yearly_lesson_id) : null;
      const subject = subjects.find(s => s.id === lesson.subject);

      const timeSlot = timeSlots.find(ts => ts.period === lesson.period_slot) || null; // Fallback null

      let steps = [];
      let description = '';
      let topicName = '';

      // Deklariere allerleiTopicIds hier am Anfang!
      let allerleiTopicIds = [];
      let primaryTopicId = undefined;

      // 1. Topic-Name (nur wenn expandiert)
      if (yearlyLesson?.expand?.topic?.name) {
        topicName = yearlyLesson.expand.topic.name;
      } else if (secondYearlyLesson?.expand?.topic?.name) {
        topicName = secondYearlyLesson.expand.topic.name;
      }
      // Fallback: direkte Felder aus yearlyLesson (wie in alter Version)
      else if (yearlyLesson?.topic_name) {
        topicName = yearlyLesson.topic_name;
      }

      // 2. Steps - Bei Doppellektionen BEIDE kombinieren
      if (lesson.is_double_lesson && yearlyLesson?.steps?.length > 0 && secondYearlyLesson?.steps?.length > 0) {
        // Beide Steps zusammenführen
        steps = [...yearlyLesson.steps, ...secondYearlyLesson.steps];
      } else if (lesson.is_double_lesson && yearlyLesson?.steps?.length > 0) {
        // Nur erste YearlyLesson hat Steps
        steps = yearlyLesson.steps;
      } else if (lesson.is_double_lesson && secondYearlyLesson?.steps?.length > 0) {
        // Nur zweite YearlyLesson hat Steps
        steps = secondYearlyLesson.steps;
      } else if (yearlyLesson?.steps?.length > 0) {
        steps = yearlyLesson.steps;
      } else if (secondYearlyLesson?.steps?.length > 0) {
        steps = secondYearlyLesson.steps;
      }

      // 3. Description/Titel
      if (yearlyLesson?.title) {
        description = yearlyLesson.title;
      } else if (yearlyLesson?.name) {
        description = yearlyLesson.name;
      } else if (yearlyLesson?.notes) {
        description = yearlyLesson.notes;
      } else if (secondYearlyLesson?.title || secondYearlyLesson?.name || secondYearlyLesson?.notes) {
        description = secondYearlyLesson.title || secondYearlyLesson.name || secondYearlyLesson.notes;
      } else {
        description = 'Lektion';
      }

      // Thema + Titel kombinieren
      if (topicName && description !== 'Lektion') {
        description = `${topicName}: ${description}`;
      } else if (topicName) {
        description = topicName;
      }

      // Steps IDs sicherstellen
      steps = steps.map((step, index) => ({
        ...step,
        id: step.id || `${lesson.id}-step-${index}`
      }));

      // Initialisiere mit Default-Werten (nicht überschreiben!)
      let displayTimeSlot = timeSlot;
      let spansSlots = 1;
      let allerleiColors = [];
      let isAllerlei = false;

      // WICHTIG: steps, description und topicName NUR hier setzen, nicht vorher überschreiben!
      // Für normale Lektionen bleiben die oben gesetzten Werte erhalten
      // Für Allerlei werden sie im Block überschrieben

      // --- ALLERLEI LOGIK ---
      if (lesson.primary_yearly_lesson_id || lesson.expand?.primary_yearly_lesson_id?.id) {
        isAllerlei = true;

        // Sicherstellen, dass wir die expand-Daten haben
        const primary = lesson.expand?.primary_yearly_lesson_id || yearlyLessons.find(yl => yl.id === lesson.primary_yearly_lesson_id);
        primaryTopicId = primary ? (primary.topic_id || primary.expand?.topic?.id) : undefined;
        const addedRaw = lesson.expand?.added_yearly_lesson_ids || [];
        const added = addedRaw.length > 0 ? addedRaw : (lesson.added_yearly_lesson_ids || []).map(id => yearlyLessons.find(yl => yl.id === id)).filter(Boolean);

        const allYL = [primary, ...added].filter(Boolean);

        if (allYL.length > 0) {
          // Jetzt sicher innerhalb
          allerleiTopicIds = [...new Set(
            allYL
              .map(yl => yl?.topic_id || yl?.expand?.topic?.id)
              .filter(Boolean)
          )];
          // 1. Farben sammeln – sehr robust
          allerleiColors = allYL
            .map(yl => {
              if (!yl) return null;
              // Verschiedene mögliche Quellen für die Farbe
              return yl.expand?.subject?.color || yl.subject_color || yl.subject?.color || '#94a3b8';
            })
            .filter(color => color && color.startsWith('#'));

          // Fallback-Farben, falls gar keine gefunden
          if (allerleiColors.length === 0) {
            allerleiColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
          }

          // 2. Spanning: Anzahl der YearlyLessons
          spansSlots = allYL.length;

          // 3. Zeit anpassen
          const periods = allYL.map(yl => yl.period_slot || lesson.period_slot).filter(Boolean);
          if (periods.length > 1) {
            periods.sort((a, b) => a - b);
            const lastPeriod = periods[periods.length - 1];
            const lastTimeSlot = timeSlots.find(ts => ts.period === lastPeriod);
            if (lastTimeSlot) {
              displayTimeSlot = {
                ...timeSlot,
                end: lastTimeSlot.end
              };
            }
          }

          // 4. Steps aus ALLEN YearlyLessons sammeln und zusammenführen
          steps = [];

          allYL.forEach((yl, ylIndex) => {
            if (yl?.steps && yl.steps.length > 0) {
              const ylSteps = yl.steps.map((step, index) => ({
                ...step,
                id: step.id || `${lesson.id}-yl${ylIndex}-step-${index}`,
                // Optional: Merke dir, aus welchem Fach der Step kommt (für spätere Anzeige)
                _sourceYearlyLesson: yl.id,
                _sourceSubjectName: yl.expand?.subject?.name || yl.subject_name || 'Unbekannt',
              }));
              steps = steps.concat(ylSteps);
            }
          });

          // Falls gar keine Steps → leeren Array lassen oder Fallback
          if (steps.length === 0) {
            steps = []; // oder [{ activity: "Freie Arbeit", time: "45", workForm: "Group" }]
          }

          // Nach dem Sammeln der Farben
          const subjectNames = allYL
            .map(yl => yl.expand?.subject?.name || yl.subject_name || 'Unbekannt')
            .filter((name, index, arr) => arr.indexOf(name) === index); // unique

          if (subjectNames.length > 1) {
            description = `Allerlei: ${subjectNames.join(' + ')}`;
          } else if (subjectNames.length === 1) {
            description = `Allerlei: ${subjectNames[0]}`;
          } else {
            description = 'Allerlei';
          }

          // Topic aus primary behalten (falls vorhanden)
          if (primary?.expand?.topic?.name) {
            const topicName = primary.expand.topic.name;
            description = `${topicName}: ${description}`;
          } else if (primary?.topic_name) {
            description = `${primary.topic_name}: ${description}`;
          }
        }
      }
      // --- DOPPELLEKTION (normal) ---
      else if (lesson.is_double_lesson) {
        const nextPeriod = lesson.period_slot + 1;
        const nextTimeSlot = timeSlots.find(ts => ts.period === nextPeriod);
        if (nextTimeSlot) {
          spansSlots = 2;
          displayTimeSlot = { ...timeSlot, end: nextTimeSlot.end };
        }
      }

      const enrichedLesson = {
        ...lesson,
        type: 'lesson',
        // WICHTIG: subject NICHT überschreiben mit fester Farbe!
        // Behalte das echte subject (falls vorhanden), aber bei Allerlei ignorieren wir es eh
        subject: subject ? {
          ...subject,
          name: subject.name || lesson.subject_name || 'Unbekannt',
          color: subject.color || '#3b82f6' // nur als Fallback, wird bei normalen Lektionen verwendet
        } : null,

        timeSlot: displayTimeSlot,
        steps,
        description,
        progress: displayTimeSlot ? calculateProgress(displayTimeSlot.start, displayTimeSlot.end) : 0,
        spansSlots,                    // ← jetzt korrekt >1 bei Allerlei
        allerleiColors,                // ← gefüllt bei Allerlei
        is_allerlei: isAllerlei,

        // Neu: Für TopicProgress
        allerleiTopicIds: isAllerlei ? allerleiTopicIds : undefined,

        // Optional: Auch die primary Topic-ID separat, falls du sie brauchst
        primaryTopicId,

        // Optional: Für Konsistenz auch hier Name/Emoji setzen
        displayName: isAllerlei ? 'Allerlei' : (subject?.name || lesson.subject_name || 'Unbekannt'),
        displayEmoji: isAllerlei ? '🌈' : (subject?.emoji || '📚'),
      };

      // Debug: Logge Fachfarbe für jede Lesson – null-sicher!
      console.log("Debug Fachfarbe für Lesson", lesson.id, {
        subjectId: lesson.subject,
        foundSubject: subject ? `Found: ${subject.name} (${subject.color})` : 'Kein Subject (Allerlei oder fehlt)',
        finalColor: enrichedLesson.subject?.color || 'N/A (Allerlei → Gradient)',
        subjectInEnriched: !!enrichedLesson.subject,
        displayName: enrichedLesson.displayName,
        isAllerlei: isAllerlei,
        spansSlots,
        allerleiColors: allerleiColors.length > 0 ? allerleiColors : 'keine Farben',
        description,
      });

      // Debug: Logge die normalisierten Allerlei-Daten
      if (lesson.is_allerlei) {
        console.log("Debug: Normalized Allerlei Lesson in DailyView", {
          lessonId: lesson.id,
          color: enrichedLesson.color,
          isGradient: enrichedLesson.isGradient,
          allerlei_subjects: lesson.allerlei_subjects
        });
      }

      return enrichedLesson;
    }).sort((a, b) => a.period_slot - b.period_slot);
  }, [allLessons, yearlyLessons, subjects, timeSlots, dayOfWeek, currentWeek, calculateProgress]);
  
  // Create a combined schedule of lessons and breaks for the current item logic
  const combinedSchedule = useMemo(() => {
    const validItems = [...lessonsForDate, ...breaks.map(b => ({...b, type: 'break'}))].filter(item => item.timeSlot); // Filter ungültige Items
    return validItems.sort((a, b) => {
      if (!a.timeSlot || !b.timeSlot) return 0; // Fallback für fehlende timeSlots
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
  // WICHTIG: Pausen haben Prioritaet ueber Doppellektionen waehrend der Pausenzeit
  const currentItem = useMemo(() => {
    if (!combinedSchedule.length) return null;

    const now = new Date();
    const todayDate = new Date().toDateString();
    const selectedDateString = currentDate.toDateString();

    if (todayDate !== selectedDateString) return null;

    // PRIORITAET 1: Pausen zuerst pruefen (wichtig fuer Doppellektionen!)
    const currentBreak = breaks.find(breakItem => {
      const breakStart = new Date(`${now.toDateString()} ${breakItem.timeSlot.start}`);
      const breakEnd = new Date(`${now.toDateString()} ${breakItem.timeSlot.end}`);
      return now >= breakStart && now <= breakEnd;
    });

    if (currentBreak) {
      return { ...currentBreak, type: 'break' };
    }

    // PRIORITAET 2: Dann Lektionen pruefen
    return combinedSchedule.find(item => {
      if (!item.timeSlot || item.type === 'break') return false;

      const itemStart = new Date(`${now.toDateString()} ${item.timeSlot.start}`);
      const itemEnd = new Date(`${now.toDateString()} ${item.timeSlot.end}`);

      return now >= itemStart && now <= itemEnd;
    });
  }, [combinedSchedule, breaks, currentDate, currentTime]);

  // Find the next lesson that comes after the current break
  const nextLessonAfterPause = useMemo(() => {
    if (currentItem?.type !== 'break') return null;

    const currentBreakIndex = combinedSchedule.findIndex(item =>
      item.type === 'break' && item.timeSlot?.start === currentItem.timeSlot?.start
    );
    return combinedSchedule.find((item, index) => index > currentBreakIndex && item.type === 'lesson');
  }, [currentItem, combinedSchedule]);

  // Find the previous lesson that came before the current break
  // (needed for detecting internal double-lesson breaks)
  const previousLessonBeforePause = useMemo(() => {
    if (currentItem?.type !== 'break') return null;

    const currentBreakIndex = combinedSchedule.findIndex(item =>
      item.type === 'break' && item.timeSlot?.start === currentItem.timeSlot?.start
    );
    // Suche die letzte Lektion VOR diesem Break
    for (let i = currentBreakIndex - 1; i >= 0; i--) {
      if (combinedSchedule[i]?.type === 'lesson') {
        return combinedSchedule[i];
      }
    }
    return null;
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
  const lastPlayedLessonEndRef = useRef(null);
  useEffect(() => {
      if (customization.audio?.lessonEndEnabled && currentItem?.type === 'lesson') {
          const now = new Date();
          const lessonEndTime = new Date(`${now.toDateString()} ${currentItem.timeSlot.end}`);
          const secondsToEnd = (lessonEndTime.getTime() - now.getTime()) / 1000;

          // Spiele Ton wenn 0-1.5 Sekunden vor Ende und noch nicht für diese Lektion gespielt
          const lessonKey = `${currentItem.period_slot}-${currentItem.timeSlot.end}`;
          if (secondsToEnd > 0 && secondsToEnd < 1.5 && lastPlayedLessonEndRef.current !== lessonKey) {
              lastPlayedLessonEndRef.current = lessonKey;
              playSound(customization.audio.lessonEndSound || 'chime', customization.audio.volume || 0.5);
          }
      }
  }, [currentTime, currentItem, customization.audio]);

  // Play audio at the start of a lesson
  const lastPlayedLessonStartRef = useRef(null);
  useEffect(() => {
      if (customization.audio?.lessonStartEnabled && currentItem?.type === 'lesson') {
          const now = new Date();
          const lessonStartTime = new Date(`${now.toDateString()} ${currentItem.timeSlot.start}`);
          const secondsFromStart = (now.getTime() - lessonStartTime.getTime()) / 1000;

          // Spiele Ton wenn 0-3 Sekunden nach Start und noch nicht für diese Lektion gespielt
          const lessonKey = `${currentItem.period_slot}-${currentItem.timeSlot.start}`;
          if (secondsFromStart >= 0 && secondsFromStart < 3 && lastPlayedLessonStartRef.current !== lessonKey) {
              lastPlayedLessonStartRef.current = lessonKey;
              playSound(customization.audio.lessonStartSound || 'bell', customization.audio.volume || 0.5);
          }
      }
  }, [currentTime, currentItem, customization.audio]);

  // Auto-focus current lesson/item if enabled
  useEffect(() => {
    if (currentItem && currentItem.type === 'lesson' && currentItem !== selectedItem) {
      setSelectedItem(currentItem);
    }
  }, [currentItem, selectedItem]);

  // Auto-select first lesson when tour is active
  useEffect(() => {
    if (activeTour && lessonsForDate.length > 0 && !selectedItem) {
      const firstLesson = lessonsForDate.find(item => item.type === 'lesson');
      if (firstLesson) {
        setSelectedItem(firstLesson);
      }
    }
  }, [activeTour, lessonsForDate, selectedItem]);

  // Auto-switch aus forcePauseView wenn nächste Lektion beginnt
  useEffect(() => {
    if (!forcePauseView || !nextLessonAfterPause?.timeSlot?.start) return;

    const nextStart = new Date(`${new Date().toDateString()} ${nextLessonAfterPause.timeSlot.start}`);

    // Wenn aktuelle Zeit >= Start der nächsten Lektion → zurück zur Lektionsansicht
    if (currentTime >= nextStart) {
      setForcePauseView(false);
    }
  }, [forcePauseView, nextLessonAfterPause, currentTime]);
  
  const handleItemSelect = useCallback((item) => {
      if(item.type === 'lesson') {
        setSelectedItem(item);
        setManualStepIndex(null);
        // Emit tour event when lesson is clicked
        if (activeTour) {
          emitTourEvent(TOUR_EVENTS.DAILY_LESSON_CLICKED);
        }
      }
  }, [activeTour]);

  const handleManualStepChange = useCallback((index) => {
      setManualStepIndex(index);
  }, []);

  // Handler für Step-Completion Sound - mit Tracking um Mehrfach-Abspielen zu verhindern
  const handleStepComplete = useCallback((lessonId, stepIndex) => {
      const stepKey = `${lessonId}-step-${stepIndex}`;

      // Prüfe ob dieser Sound bereits gespielt wurde
      if (playedStepSounds.has(stepKey)) return;

      // Markiere als gespielt
      setPlayedStepSounds(prev => new Set(prev).add(stepKey));

      if (customization.audio?.stepEndEnabled) {
          playSound(customization.audio.stepEndSound || 'ping', customization.audio.volume || 0.5);
      }
  }, [customization.audio, playedStepSounds]);

  // Handler für Ämtli-Completion
  const handleChoreCompletion = useCallback(async (assignmentIds, status) => {
    try {
      const now = new Date().toISOString();
      const isCompleted = status === 'completed';

      await Promise.all(assignmentIds.map(id =>
        ChoreAssignment.update(id, {
          status: status,
          is_completed: isCompleted, // Rückwärtskompatibilität
          completed_at: isCompleted ? now : null
        })
      ));

      // Refresh assignments
      const userId = pb.authStore.model?.id;
      const updatedAssignments = await ChoreAssignment.list({ user_id: userId });
      setChoreAssignments(updatedAssignments || []);

      // Status-spezifische Toast-Nachrichten
      const messages = {
        completed: 'Ämtli als erledigt markiert!',
        not_completed: 'Ämtli als nicht erledigt markiert.',
        pending: 'Ämtli zurückgesetzt.'
      };
      toast.success(messages[status] || 'Ämtli-Status aktualisiert.');
    } catch (error) {
      console.error('Error updating chore completion:', error);
      toast.error('Fehler beim Aktualisieren des Ämtli.');
    }
  }, []);

  // Speicherfunktion für Customization - SOFORT speichern, nicht im useEffect
  const saveCustomizationToDb = useCallback(async (customizationData) => {
    try {
      const userId = pb.authStore.model?.id;
      if (!userId) return;

      const settings = await CustomizationSettings.list({ filter: `user_id = "${userId}"` });
      const data = {
        user_id: userId,
        theme: customizationData.theme || 'default',
        background_type: customizationData.background?.type,
        background_value: customizationData.background?.value,
        font_size_title: customizationData.fontSize?.title,
        font_size_content: customizationData.fontSize?.content,
        font_size_steps: customizationData.fontSize?.steps,
        show_overview: customizationData.showOverview,
        auto_focus_current_lesson: customizationData.autoFocusCurrentLesson,
        compact_mode: customizationData.compactMode,
        reduced_motion: customizationData.reducedMotion,
        audio_volume: customizationData.audio?.volume,
        audio_lesson_end_enabled: customizationData.audio?.lessonEndEnabled || false,
        audio_lesson_end_sound: customizationData.audio?.lessonEndSound || 'chime',
        audio_lesson_start_enabled: customizationData.audio?.lessonStartEnabled || false,
        audio_lesson_start_sound: customizationData.audio?.lessonStartSound || 'bell',
        audio_step_end_enabled: customizationData.audio?.stepEndEnabled || false,
        audio_step_end_sound: customizationData.audio?.stepEndSound || 'ping',
        transparency_mode: customizationData.transparencyMode,
        force_dark_text: customizationData.forceDarkText,
        force_light_text: customizationData.forceLightText,
      };

      if (settings && settings.length > 0) {
        await CustomizationSettings.update(settings[0].id, data);
      } else {
        await CustomizationSettings.create(data);
      }
    } catch (error) {
      console.error("Error saving customization:", error);
    }
  }, []);

  // Ref für Theme-Tracking (verhindert stale closure)
  const prevThemeRef = useRef(customization.theme);

  // Synchronisiere Ref wenn Theme extern geändert wird (z.B. DB-Load)
  useEffect(() => {
    console.log('[DailyView] useEffect Theme-Sync:', {
      prevRef: prevThemeRef.current,
      newTheme: customization.theme
    });
    prevThemeRef.current = customization.theme;
  }, [customization.theme]);

  // DEBUG: Log wenn customization sich ändert
  useEffect(() => {
    console.log('[DailyView] customization.theme geändert:', customization.theme);
  }, [customization.theme]);

  // Handler für Customization-Änderungen mit Theme-Synchronisation
  const handleCustomizationChange = useCallback((newCustomization) => {
    console.log('[DailyView] handleCustomizationChange aufgerufen:', {
      newTheme: newCustomization.theme,
      prevRefTheme: prevThemeRef.current,
      hasOnThemeChange: !!onThemeChange,
      willCallOnThemeChange: onThemeChange && newCustomization.theme !== prevThemeRef.current
    });

    // Theme-Änderung nach oben melden (für Space-Theme Wrapper in Timetable)
    if (onThemeChange && newCustomization.theme !== prevThemeRef.current) {
      console.log('[DailyView] -> onThemeChange wird aufgerufen mit:', newCustomization.theme);
      onThemeChange(newCustomization.theme);
    }
    // Ref IMMER aktualisieren
    prevThemeRef.current = newCustomization.theme;
    setCustomization(newCustomization);

    // SOFORT in DB speichern - nicht auf useEffect warten!
    saveCustomizationToDb(newCustomization);
  }, [onThemeChange, saveCustomizationToDb]);

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

    // Space Theme: Kein eigener Hintergrund, SpaceBackground übernimmt
    if (theme === 'space') {
      return { background: 'transparent' };
    }

    if (background.type === 'solid') {
      return { backgroundColor: background.value || '#ffffff' };
    }

    if (background.type === 'image') {
      return {
        backgroundImage: `url(${background.value})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      };
    }

    // Gradient-Fall: Priorisiere manuelle Auswahl, sonst Theme-Gradient, sonst Default
    if (background.type === 'gradient' && background.value) {
      return { background: background.value };
    }

    // Fallback: Transparent, damit der Timetable/Layout-Gradient durchscheint
    return { background: 'transparent' };
  };

  const mainGridStyle = useMemo(() => {
    if (!customization.showOverview) {
      return {
        gridTemplateColumns: '1fr',
      };
    }

    return {
      gridTemplateColumns: 'minmax(0, 0.7fr) minmax(0, 2fr)', // Ändere zu 1fr 2fr, um das rechte Panel schmaler zu machen
      gap: '0.5rem', // Reduziere gap, um Panels näher zusammenzubringen
      height: '100%',
    };
  }, [customization.showOverview]);

  // const themeStyles = getThemeStyles(customization.theme);
  const themeStyles = { background: '', textColor: '' }; // neutral

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CalendarLoader />
      </div>
    );
  }

  // Space Theme Wrapper - jetzt in Timetable.jsx gehandhabt
  const Wrapper = React.Fragment;

  return (
    <Wrapper>
    <motion.div
      className="h-full w-full overflow-hidden relative font-[Poppins] flex flex-col"
      style={{ ...getBackgroundStyle() }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Main Content Area - flex-1 min-h-0 für korrekte Höhenanpassung */}
      <div
        className={`flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-2 md:gap-3 items-stretch ${
          isFullscreen ? 'p-0' : 'p-4'
        }`}
      >
        {/* Lesson Overview Panel */}
        {customization.showOverview && (
          <motion.div
            className="min-w-0 min-h-0 self-stretch"
          >
            <LessonOverviewPanel
              items={lessonsForDate}
              selectedItem={selectedItem}
              onItemSelect={handleItemSelect}
              currentHoliday={currentHoliday}
              customization={customization}
              currentItem={currentItem}
              theme={customization.theme || 'default'}
              isDark={isDark}
              // Button Props
              onSettingsClick={() => setShowCustomization(true)}
              onFullscreenToggle={toggleFullscreen}
              isFullscreen={isFullscreen}
              forcePauseView={forcePauseView}
              onPauseToggle={() => setForcePauseView(prev => !prev)}
              showChoresView={manualChoresView}
              onChoresToggle={() => setManualChoresView(prev => !prev)}
            />
          </motion.div>
        )}

        {/* Main Central Panel */}
        <div className="overflow-y-auto overflow-x-hidden min-w-0 min-h-0 flex flex-col self-stretch" style={{ maxWidth: '100%' }}>
          {manualChoresView ? (
            <ChoresDisplay
              assignments={todaysAssignments}
              chores={chores}
              students={students}
              customization={customization}
              isDark={isDark}
              onMarkCompleted={handleChoreCompletion}
            />
          ) : forcePauseView ? (
            (() => {
              // Prüfe ob Doppellektions-Pause (interne Pause zwischen Teil 1 und Teil 2)
              // Korrigiert: Verwende previousLessonBeforePause statt selectedItem
              const isDoubleLessonBreak = previousLessonBeforePause?.is_double_lesson &&
                nextLessonAfterPause?.id === previousLessonBeforePause?.id;

              // Farbe der nächsten Lektion (Fallback: Orange)
              const nextSubjectColor = nextLessonAfterPause?.subject?.color || '#f97316';

              // Materialien sammeln (dedupliziert)
              const materials = [...new Set(
                nextLessonAfterPause?.steps
                  ?.map(step => step.material)
                  .filter(m => m && m.trim() !== '' && m !== '–')
              )] || [];

              // Theme-abhängige Transparenz für Pause-Ansicht
              const pauseBgClass = customization.theme === 'space'
                ? 'bg-white/30 dark:bg-slate-900/30 border border-white/20 dark:border-white/10'
                : 'bg-white/95 dark:bg-slate-900/95';

              return (
            <div className={`rounded-2xl shadow-2xl ${pauseBgClass} overflow-hidden h-full flex flex-col items-center justify-center p-8`}>
              {/* Kaffeetasse - Farbe des nächsten Fachs */}
              <Coffee className="w-20 h-20 mb-4 animate-pulse" style={{ color: nextSubjectColor }} />

              {/* Pause Text */}
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                Pause
              </h2>

              {/* Timer bis zur nächsten Lektion - Farbe des nächsten Fachs */}
              {nextLessonAfterPause?.timeSlot?.start && (() => {
                const nextStart = new Date(`${new Date().toDateString()} ${nextLessonAfterPause.timeSlot.start}`);
                const remainingMs = Math.max(0, nextStart - currentTime);
                const remainingMinutes = Math.floor(remainingMs / 60000);
                const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

                return (
                  <div className="text-5xl font-bold tabular-nums mb-8" style={{ color: nextSubjectColor }}>
                    {String(remainingMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
                  </div>
                );
              })()}

              {/* Nächste Lektion - NICHT anzeigen bei Doppellektions-Pause */}
              {nextLessonAfterPause && !isDoubleLessonBreak && (
                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Nächste Lektion
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{nextLessonAfterPause.displayEmoji || nextLessonAfterPause.subject?.emoji || '📚'}</span>
                    <span className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {nextLessonAfterPause.displayName || nextLessonAfterPause.subject?.name || 'Unbekannt'}
                    </span>
                  </div>

                  {/* Materialien der nächsten Lektion - Bullet Points in Fachfarbe */}
                  {materials.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        Materialien bereitstellen:
                      </h4>
                      <ul className="space-y-1">
                        {materials.map((material, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nextSubjectColor }}></span>
                            {material}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col gap-2 mt-6">
                {nextLessonAfterPause && !isDoubleLessonBreak && (
                  <Button
                    onClick={() => {
                      setSelectedItem(nextLessonAfterPause);
                      setForcePauseView(false);
                    }}
                    className="px-6 py-3 text-white"
                    style={{ backgroundColor: nextSubjectColor }}
                  >
                    Nächste Lektion starten
                  </Button>
                )}
                <Button
                  onClick={() => setForcePauseView(false)}
                  variant="outline"
                  className="px-6 py-3"
                >
                  Zurück zur aktuellen Lektion
                </Button>
              </div>
            </div>
              );
            })()
          ) : showChoresView ? (
            <ChoresDisplay
              assignments={todaysAssignments}
              chores={chores}
              students={students}
              customization={customization}
              isDark={isDark}
              onMarkCompleted={handleChoreCompletion}
            />
          ) : selectedItem ? (
            <LessonDetailPanel
              lesson={selectedItem}
              currentItem={currentItem}
              nextLesson={nextLessonAfterPause}
              previousLesson={previousLessonBeforePause}
              customization={customization}
              currentTime={currentTime}
              selectedDate={currentDate}
              manualStepIndex={manualStepIndex}
              onManualStepChange={handleManualStepChange}
              onStepComplete={handleStepComplete}
              playedStepSounds={playedStepSounds}
              theme={customization.theme || 'default'}
              isDark={isDark}
              onEndBreakEarly={() => {
                if (nextLessonAfterPause) {
                  setSelectedItem(nextLessonAfterPause);
                  setForcePauseView(false);
                }
              }}
            />
          ) : (
            <div className={`flex items-center justify-center h-full text-center rounded-2xl ${
              customization.theme === 'space' ? 'bg-transparent' : 'bg-white/50 dark:bg-slate-800/50'
            }`}>
              <div>
                <div className="text-6xl mb-4">{lessonsForDate.length > 0 ? '👈' : '📚'}</div>
                <h2 className={`${customization.fontSize.title} font-bold mb-2 font-[Inter] ${
                  customization.theme === 'space' ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {lessonsForDate.length > 0 ? 'Wähle eine Lektion' : 'Keine Lektionen'}
                </h2>
                {lessonsForDate.length === 0 && (
                  <p className={`${customization.fontSize.content} font-[Poppins] ${
                    customization.theme === 'space' ? 'text-white/70' : 'text-slate-500 dark:text-slate-500'
                  }`}>
                    {dayName}, {formatDate(currentDate)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customization Slide-Panel */}
      <AnimatePresence>
        {showCustomization && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => setShowCustomization(false)}
            />
            {/* Slide Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-slate-900 z-50 shadow-2xl overflow-hidden"
            >
              <CustomizationPanel
                customization={customization}
                onCustomizationChange={handleCustomizationChange}
                onClose={() => setShowCustomization(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
    </Wrapper>
  );
}