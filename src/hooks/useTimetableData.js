import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lesson, YearlyLesson, AllerleiLesson, Topic, Subject, Class, Setting, Holiday, Student } from "@/api/entities";
import pb from '@/api/pb';
import { useLessonStore } from '@/store';
import { isEqual } from 'lodash';

const useTimetableData = (currentYear, currentWeek, initialClassId = null, onClassIdChange = null) => {
  const {
    setAllLessons,
    setYearlyLessons,
    setAllerleiLessons,
    setTopics,
    setSubjects,
    setClasses,
    setHolidays,
    setSettings,
    allLessons,
    yearlyLessons,
    allerleiLessons,
    topics,
    subjects,
    classes,
    holidays,
    settings,
  } = useLessonStore();
  const [activeClassId, setActiveClassIdInternal] = useState(initialClassId);
  const queryClientLocal = useQueryClient();

  const userId = pb.authStore.model?.id;
  const isStudent = pb.authStore.model?.role === 'student';

  // Wrapper für setActiveClassId der optionalen Callback aufruft
  const setActiveClassId = (newClassId) => {
    setActiveClassIdInternal(newClassId);
    if (onClassIdChange) {
      onClassIdChange(newClassId);
    }
  };

  // Sync initialClassId → State (wenn von außen geändert)
  useEffect(() => {
    if (initialClassId !== activeClassId) {
      setActiveClassIdInternal(initialClassId);
    }
  }, [initialClassId]);

  // Reset activeClassId wenn sich der User ändert (Login/Logout)
  useEffect(() => {
    setActiveClassIdInternal(null);
    if (onClassIdChange) {
      onClassIdChange(null);
    }
  }, [userId]);

  const { data, isLoading: queryLoading, error: queryError, refetch } = useQuery({
    queryKey: ['timetableData', userId, currentYear, currentWeek],
    queryFn: async () => {
      if (!userId) {
        console.log('No user ID available for query');
        return {
          lessonsData: [],
          allerleiLessonsData: [],
          topicsData: [],
          subjectsData: [],
          classesData: [],
          settingsData: [],
          holidaysData: [],
        };
      }
      try {
        // STUDENT-PFAD: Lade die zugewiesene Klasse des Schülers
        if (isStudent) {
          const students = await Student.list();
          const studentData = students.find(s => s.account_id === userId);

          if (!studentData?.class_id) {
            // Schüler hat keine zugewiesene Klasse
            return {
              lessonsData: [],
              yearlyLessonsData: [],
              allerleiLessonsData: [],
              topicsData: [],
              subjectsData: [],
              classesData: [],
              settingsData: [],
              holidaysData: [],
              isStudent: true,
            };
          }

          // Nutze expandierte Klassendaten aus Student-Record (umgeht PocketBase Rules)
          // Falls expand fehlschlägt, nutze user_id vom Student-Record als Fallback
          const classData = studentData.expanded_class;
          const teacherUserId = classData?.user_id || studentData.user_id;

          if (!teacherUserId) {
            console.error('Could not determine teacher user_id for student');
            return {
              lessonsData: [],
              yearlyLessonsData: [],
              allerleiLessonsData: [],
              topicsData: [],
              subjectsData: [],
              classesData: [],
              settingsData: [],
              holidaysData: [],
              isStudent: true,
            };
          }

          // DEBUG: Prüfe Student-Daten
          console.log('🔍 Student Data:', {
            studentId: studentData.id,
            classId: studentData.class_id,
            teacherUserId,
            expandedClass: classData,
          });

          // Lade alle Daten für diese Klasse (Settings vom Klassenbesitzer)
          const [lessonsData, yearlyLessonsData, topicsData, subjectsData, settingsData, holidaysData] = await Promise.all([
            Lesson.filter({ class_id: studentData.class_id }).then(data => {
              console.log('📚 Lessons loaded:', data.length);
              return data;
            }).catch(err => {
              console.error('❌ Lessons error:', err);
              return [];
            }),
            YearlyLesson.filter({ class_id: studentData.class_id }).then(data => {
              console.log('📅 YearlyLessons loaded:', data.length);
              return data;
            }).catch(err => {
              console.error('❌ YearlyLessons error:', err);
              return [];
            }),
            Topic.filter({ class_id: studentData.class_id }).catch(() => []),
            Subject.filter({ class_id: studentData.class_id }).then(data => {
              console.log('📖 Subjects loaded:', data.length);
              return data;
            }).catch(err => {
              console.error('❌ Subjects error:', err);
              return [];
            }),
            Setting.list({ user_id: teacherUserId }).then(data => {
              console.log('⚙️ Settings loaded:', data.length);
              return data;
            }).catch(err => {
              console.error('❌ Settings error:', err);
              return [];
            }),
            Holiday.list({ user_id: teacherUserId }).catch(() => []),
          ]);

          // Fallback classData falls expand fehlgeschlagen ist
          const effectiveClassData = classData || {
            id: studentData.class_id,
            name: 'Meine Klasse',
            user_id: teacherUserId,
          };

          return {
            lessonsData: lessonsData || [],
            yearlyLessonsData: yearlyLessonsData || [],
            allerleiLessonsData: [],
            topicsData: topicsData || [],
            subjectsData: subjectsData || [],
            classesData: [{
              ...effectiveClassData,
              isOwner: false,
              permissionLevel: 'view_only',
            }],
            settingsData: settingsData || [],
            holidaysData: holidaysData || [],
            isStudent: true,
          };
        }

        // LEHRER-PFAD: Lade eigene Daten + Team Teaching Zugriffe parallel
        const [lessonsData, yearlyLessonsData, allerleiLessonsData, topicsData, subjectsData, ownedClassesData, settingsData, holidaysData, teamTeachingAccess] = await Promise.all([
          Lesson.list({ user_id: userId }).catch(err => {
            console.error('Lesson.list error:', err);
            return [];
          }),
          YearlyLesson.list({ user_id: userId }).catch(err => {
            console.error('YearlyLesson.list error:', err);
            return [];
          }),
          AllerleiLesson.list({ user_id: userId }).catch(err => {
            console.error('AllerleiLesson.list error:', err);
            return [];
          }),
          Topic.list({ 'class_id.user_id': userId }).catch(err => {
            console.error('Topic.list error:', err);
            return [];
          }),
          Subject.list({ 'class_id.user_id': userId }).catch(err => {
            console.error('Subject.list error:', err);
            return [];
          }),
          Class.list({ user_id: userId }).catch(err => {
            console.error('Class.list error:', err);
            return [];
          }),
          Setting.list({ user_id: userId }).catch(err => {
            console.error('Setting.list error:', err);
            return [];
          }),
          Holiday.list({ user_id: userId }).catch(err => {
            console.error('Holiday.list error:', err);
            return [];
          }),
          // Team Teaching: Lade akzeptierte Einladungen mit expand für Klassendaten
          // Direkter PocketBase-Aufruf um expand-Daten zu behalten (Entity.list() entfernt expand durch normalizeData)
          // WICHTIG: owner_id != userId um Self-Team-Teaching-Records auszuschließen
          pb.collection('team_teachings').getFullList({
            filter: `invited_user_id = '${userId}' && status = 'accepted' && owner_id != '${userId}'`,
            expand: 'class_id,owner_id',
            $autoCancel: false // Verhindert Auto-Cancellation bei parallelen Requests
          }).catch(err => {
            console.error('TeamTeaching.list error:', err);
            return [];
          }),
        ]);

        // 2. Lade Daten fuer geteilte Klassen
        let sharedClassesData = [];
        let sharedSubjectsData = [];
        let sharedTopicsData = [];
        let sharedLessonsData = [];
        let sharedYearlyLessonsData = [];

        if (teamTeachingAccess.length > 0) {
          // Lade geteilte Klassen und deren Daten - nutze expand-Daten statt Class.findById
          const sharedDataPromises = teamTeachingAccess
            .filter(tt => tt.expand?.class_id)  // Nur Einträge mit expand-Daten
            .map(async (ttEntry) => {
              const classId = ttEntry.class_id;
              const classData = ttEntry.expand.class_id;  // Aus expand-Daten (kein separater API-Call)

              const [classSubjects, classTopics, classLessons, classYearlyLessons] = await Promise.all([
                Subject.filter({ class_id: classId }).catch(() => []),
                Topic.filter({ class_id: classId }).catch(() => []),
                Lesson.filter({ filter: `class_id = '${classId}'` }).catch(() => []),
                YearlyLesson.filter({ class_id: classId }).catch(() => []),
              ]);

              return {
                classData: {
                  ...classData,
                  isOwner: false,
                  permissionLevel: ttEntry.permission_level || 'view_only',
                  teamTeachingId: ttEntry.id,
                  is_hidden: ttEntry.is_hidden || false
                },
                subjects: classSubjects,
                topics: classTopics,
                lessons: classLessons,
                yearlyLessons: classYearlyLessons,
                is_hidden: ttEntry.is_hidden || false
              };
            });

          const sharedResults = await Promise.all(sharedDataPromises);

          // Alle geteilten Klassen (inkl. versteckte - für Settings)
          sharedClassesData = sharedResults.map(r => r.classData).filter(Boolean);

          // NUR Daten von NICHT-versteckten Klassen laden (für Timetable, Daily etc.)
          const visibleResults = sharedResults.filter(r => !r.is_hidden);
          sharedSubjectsData = visibleResults.flatMap(r => r.subjects);
          sharedTopicsData = visibleResults.flatMap(r => r.topics);
          sharedLessonsData = visibleResults.flatMap(r => r.lessons);
          sharedYearlyLessonsData = visibleResults.flatMap(r => r.yearlyLessons);
        }

        // 3. Merge eigene und geteilte Daten
        const ownedClassesWithMeta = (ownedClassesData || []).map(cls => ({
          ...cls,
          isOwner: true,
          permissionLevel: 'full_access'
        }));

        // Deduplizierung: owned hat Priorität über shared (falls beide existieren)
        const mergedClasses = [...ownedClassesWithMeta, ...sharedClassesData];
        const uniqueClasses = mergedClasses.reduce((acc, cls) => {
          const existing = acc.find(c => c.id === cls.id);
          if (!existing) {
            acc.push(cls);
          } else if (cls.isOwner && !existing.isOwner) {
            const idx = acc.findIndex(c => c.id === cls.id);
            acc[idx] = cls;
          }
          return acc;
        }, []);

        return {
          lessonsData: [...(lessonsData || []), ...sharedLessonsData],
          yearlyLessonsData: [...(yearlyLessonsData || []), ...sharedYearlyLessonsData],
          allerleiLessonsData: allerleiLessonsData || [],
          topicsData: [...(topicsData || []), ...sharedTopicsData],
          subjectsData: [...(subjectsData || []), ...sharedSubjectsData],
          classesData: uniqueClasses,
          settingsData: settingsData || [],
          holidaysData: holidaysData || [],
        };
      } catch (error) {
        console.error('Critical error in timetableData query:', error);
        throw error;
      }
    },
    staleTime: 300000,
  });

  useEffect(() => {
    const initializeData = async () => {
      if (!pb.authStore.isValid || !pb.authStore.model) {
        console.log('No valid auth, cannot initialize data');
        return;
      }
      const currentUserId = pb.authStore.model.id;
      if (!currentUserId) {
        console.log('No user ID available');
        return;
      }
      if (!data) return;

      const hasPendingChanges = (Array.isArray(allLessons) ? allLessons : []).some(l => l.id && l.id.startsWith('temp-') && l.week_number === currentWeek);
      if (!hasPendingChanges) {
        if (!isEqual(allLessons, data.lessonsData || [])) {
          setAllLessons(data.lessonsData || []);
        }
      }
      if (!isEqual(allerleiLessons, data.allerleiLessonsData || [])) {
        setAllerleiLessons(data.allerleiLessonsData || []);
      }
      if (!isEqual(topics, data.topicsData || [])) {
        setTopics(data.topicsData || []);
      }
      if (!isEqual(classes, data.classesData || [])) {
        setClasses(data.classesData || []);
      }
      if (!isEqual(holidays, data.holidaysData || [])) {
        setHolidays(data.holidaysData || []);
      }

      let localActiveClassId = activeClassId;
      if (data.classesData.length > 0 && !activeClassId) {
        localActiveClassId = data.classesData[0].id;
        setActiveClassId(localActiveClassId);
      }

      if (localActiveClassId) {
        const filteredSubjects = data.subjectsData?.filter(s => s.class_id === localActiveClassId) || [];
        if (!isEqual(subjects, filteredSubjects)) {
          setSubjects(filteredSubjects);
        }
      }

      if (data.settingsData?.length > 0) {
        const latestSettings = data.settingsData.sort((a, b) => new Date(b.updated) - new Date(a.updated))[0];
        if (!isEqual(settings, latestSettings)) {
          setSettings(latestSettings);
        }
      } else {
        // Default-Settings Objekt
        const defaultSettingsBase = {
          scheduleType: 'flexible',
          startTime: '08:00',
          lessonsPerDay: 8,
          lessonDuration: 45,
          shortBreak: 5,
          morningBreakAfter: 2,
          morningBreakDuration: 20,
          lunchBreakAfter: 4,
          lunchBreakDuration: 40,
          afternoonBreakAfter: 6,
          afternoonBreakDuration: 15,
          cellWidth: 120,
          cellHeight: 80,
        };

        // Studenten sollten keine Settings erstellen - nur Default-Werte verwenden
        if (isStudent || data?.isStudent) {
          setSettings(defaultSettingsBase);
          return;
        }

        // Nur für Lehrer: Settings in DB erstellen
        const defaultSettings = {
          ...defaultSettingsBase,
          user_id: currentUserId,
        };
        try {
          const newSettings = await Setting.create(defaultSettings);
          setSettings(newSettings);
          queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
        } catch (error) {
          console.error('Failed to create default settings:', error?.data ? JSON.stringify(error.data) : error);
          import('react-hot-toast').then(({ toast }) => {
            toast.error('Fehler beim Erstellen der Standardeinstellungen.');
          });
        }
      }
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, queryLoading, currentYear, currentWeek, refetch, queryClientLocal]);

  return {
    data,
    isLoading: queryLoading,
    classes: data?.classesData || [],
    subjects: data?.subjectsData || [],
    settings: data?.settingsData?.[0] || {},
    holidays: data?.holidaysData || [],
    topics: data?.topicsData || [],
    refetch,
    activeClassId,
    setActiveClassId,
    isStudent: data?.isStudent || isStudent,
  };
};

export default useTimetableData;