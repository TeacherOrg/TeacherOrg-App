import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Lesson, YearlyLesson, Subject, Holiday, Setting, Class, Announcement, Chore, ChoreAssignment, Student, Topic, AllerleiLesson } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Users, Home, Zap, Coffee } from "lucide-react";
import { motion } from "framer-motion";
import CalendarLoader from "../components/ui/CalendarLoader";
import LessonOverviewPanel from "../components/daily/LessonOverviewPanel";
import LessonDetailPanel from "../components/daily/LessonDetailPanel";
import ChoresDisplay from "../components/daily/ChoresDisplay";
import { createPageUrl } from "@/utils";
import { getThemeGradient } from "@/utils/colorDailyUtils";
import { normalizeAllerleiData } from "@/components/timetable/allerlei/AllerleiUtils";
import { CustomizationSettings } from "@/api/entities";
import pb from "@/api/pb";
import { useLessonStore, useAllerleiLessons } from "@/store";

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

export default function DailyView({ currentDate, onDateChange }) {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef(null);
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
  
  // Customization settings
  const [customization, setCustomization] = useState({
    fontSize: { title: 'text-2xl', content: 'text-lg' /* removed clock */ },
    background: { type: 'gradient', value: 'from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800' },
    theme: 'default', // Fallback auf 'default'
    autoFocusCurrentLesson: true,
    showOverview: true,
    audio: { enabled: false, volume: 0.5 },
    transparencyMode: false,
    forceDarkText: false,
    forceLightText: false,
  });

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

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
            },
            showOverview: loaded.show_overview,
            autoFocusCurrentLesson: loaded.auto_focus_current_lesson,
            compactMode: loaded.compact_mode,
            audio: {
              enabled: loaded.audio_enabled,
              volume: loaded.audio_volume,
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

  // Update current time every second
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

  // Save customization settings to localStorage
  useEffect(() => {
    const saveCustomization = async () => {
      try {
        const userId = pb.authStore.model?.id;
        if (!userId) return;

        const settings = await CustomizationSettings.list({ filter: `user_id = "${userId}"` });
        const data = {
          user_id: userId,
          theme: customization.theme || 'default',
          background_type: customization.background.type,
          background_value: customization.background.value,
          font_size_title: customization.fontSize.title,
          font_size_content: customization.fontSize.content,
          show_overview: customization.showOverview,
          auto_focus_current_lesson: customization.autoFocusCurrentLesson,
          compact_mode: customization.compactMode,
          audio_enabled: customization.audio.enabled,
          audio_volume: customization.audio.volume,
          transparency_mode: customization.transparencyMode,
          force_dark_text: customization.forceDarkText,
          force_light_text: customization.forceLightText,
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

  // Memoize calculateProgress function
  const calculateProgress = useCallback((startTime, endTime) => {
    const now = new Date();
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
  }, [currentDate]);

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

          if (secondsToEnd > 0 && secondsToEnd < 1.5) { 
              audioRef.current.volume = customization.audio.volume || 0.5;
              audioRef.current.play().catch(e => console.error("Audio play failed:", e));
          }
      }
  }, [currentTime, currentItem, customization.audio]);

  // Auto-focus current lesson/item if enabled
  useEffect(() => {
    if (currentItem && currentItem.type === 'lesson' && currentItem !== selectedItem) {
      setSelectedItem(currentItem);
    }
  }, [currentItem, selectedItem]);

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
      }
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

    // Fallback: Theme-basiert (auch wenn kein manueller Gradient)
    return { background: getThemeGradient(theme || 'default', '#3b82f6', undefined, isDark) };
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

  return (
    <motion.div 
      className="h-full w-full overflow-hidden relative font-[Poppins]"
      style={{ background: '#ffffff', ...getBackgroundStyle() }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
<audio ref={audioRef} src="/audio/end_of_lesson.ogg" preload="auto" />
      
      {/* Main Content Area */}
      <div 
        className={`h-full w-full grid grid-cols-1 lg:grid-cols-[minmax(400px,35%)_1fr] gap-2 md:gap-3 overflow-hidden ${
          isFullscreen ? 'p-0' : 'p-4'
        }`}
      >
        {/* Lesson Overview Panel */}
        {customization.showOverview && (
          <motion.div 
            className="h-full overflow-hidden min-w-0"
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
              onSettingsClick={() => { /* Deaktiviert - wird später neu implementiert */ }}
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
        <div className="h-full overflow-y-auto overflow-x-hidden p-1 md:p-2 min-w-0 flex flex-col" style={{ maxWidth: '100%' }}> {/* Entferne overflowX: 'auto', um Scrollen zu vermeiden; Panel passt sich an */}
          {manualChoresView ? (
            <ChoresDisplay
              assignments={todaysAssignments}
              chores={chores}
              students={students}
              customization={customization}
              isDark={isDark}
            />
          ) : forcePauseView ? (
            <div className="rounded-2xl shadow-2xl bg-white/95 dark:bg-slate-900/95 overflow-hidden h-full flex flex-col items-center justify-center p-8">
              {/* Kaffeetasse */}
              <Coffee className="w-20 h-20 text-orange-500 mb-4 animate-pulse" />

              {/* Pause Text */}
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                Pause
              </h2>

              {/* Timer bis zur nächsten Lektion */}
              {nextLessonAfterPause?.timeSlot?.start && (() => {
                const nextStart = new Date(`${new Date().toDateString()} ${nextLessonAfterPause.timeSlot.start}`);
                const remainingMs = Math.max(0, nextStart - currentTime);
                const remainingMinutes = Math.floor(remainingMs / 60000);
                const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);

                return (
                  <div className="text-5xl font-bold text-orange-500 tabular-nums mb-8">
                    {String(remainingMinutes).padStart(2, '0')}:{String(remainingSeconds).padStart(2, '0')}
                  </div>
                );
              })()}

              {/* Nächste Lektion (falls vorhanden) */}
              {nextLessonAfterPause && (
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

                  {/* Materialien der nächsten Lektion */}
                  {(() => {
                    const materials = nextLessonAfterPause.steps
                      ?.map(step => step.material)
                      .filter(m => m && m.trim() !== '' && m !== '–')
                      || [];

                    if (materials.length === 0) return null;

                    return (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                          Materialien bereitstellen:
                        </h4>
                        <ul className="space-y-1">
                          {materials.map((material, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                              {material}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>
              )}

              <Button
                onClick={() => setForcePauseView(false)}
                className="mt-4 px-6 py-3"
              >
                Zurück zur Lektion
              </Button>
            </div>
          ) : showChoresView ? (
            <ChoresDisplay
              assignments={todaysAssignments}
              chores={chores}
              students={students}
              customization={customization}
              isDark={isDark}
            />
          ) : selectedItem ? (
            <LessonDetailPanel
              lesson={selectedItem}
              currentItem={currentItem}
              nextLesson={nextLessonAfterPause}
              customization={customization}
              currentTime={currentTime}
              selectedDate={currentDate}
              manualStepIndex={manualStepIndex}
              onManualStepChange={handleManualStepChange}
              theme={customization.theme || 'default'}
              isDark={isDark}
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
      </div>

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