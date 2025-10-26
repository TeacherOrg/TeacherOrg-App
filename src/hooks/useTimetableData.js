import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lesson, YearlyLesson, AllerleiLesson, Topic, Subject, Class, Setting, Holiday } from "@/api/entities";
import pb from '@/api/pb';
import { useLessonStore } from '@/store';
import { isEqual } from 'lodash';

const useTimetableData = (currentYear, currentWeek) => {
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
  const [activeClassId, setActiveClassId] = useState(null);
  const queryClientLocal = useQueryClient();

  const { data, isLoading: queryLoading, error: queryError, refetch } = useQuery({
    queryKey: ['timetableData', currentYear, currentWeek],
    queryFn: async () => {
      const userId = pb.authStore.model?.id;
      if (!userId) {
        console.error('No user ID available for query');
        return {
          lessonsData: [],
          yearlyLessonsData: [],
          allerleiLessonsData: [],
          topicsData: [],
          subjectsData: [],
          classesData: [],
          settingsData: [],
          holidaysData: [],
        };
      }
      try {
        const [lessonsData, yearlyLessonsData, allerleiLessonsData, topicsData, subjectsData, classesData, settingsData, holidaysData] = await Promise.all([
          Lesson.list({ user_id: userId, week_number: currentWeek }).catch(err => {
            console.error('Lesson.list error:', err);
            return [];
          }),
          YearlyLesson.list({ user_id: userId, week_number: currentWeek, school_year: currentYear }).catch(err => {
            console.error('YearlyLesson.list error:', err);
            return [];
          }),
          AllerleiLesson.list({ user_id: userId, week_number: currentWeek }).catch(err => {
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
        ]);
        console.log('Debug: Fetched data', {
          classesData,
          subjectsData: subjectsData.length,
          yearlyLessonsData: yearlyLessonsData.length,
          lessonsData: lessonsData.length,
          topicsData: topicsData.length,
        });
        return {
          lessonsData: lessonsData || [],
          yearlyLessonsData: yearlyLessonsData || [],
          allerleiLessonsData: allerleiLessonsData || [],
          topicsData: topicsData || [],
          subjectsData: subjectsData || [],
          classesData: classesData || [],
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
        console.error('No valid auth, cannot initialize data');
        return;
      }
      const currentUserId = pb.authStore.model.id;
      if (!currentUserId) {
        console.error('No user ID available');
        return;
      }
      if (!data) return;

      console.log('Debug: initializeData running with activeClassId:', activeClassId);

      const hasPendingChanges = allLessons.some(l => l.id && l.id.startsWith('temp-') && l.week_number === currentWeek);
      if (!hasPendingChanges) {
        if (!isEqual(allLessons, data.lessonsData || [])) {
          setAllLessons(data.lessonsData || []);
          console.log('Debug: Updated allLessons');
        }
      }
      if (!isEqual(yearlyLessons, data.yearlyLessonsData?.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })) || [])) {
        setYearlyLessons(data.yearlyLessonsData?.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })) || []);
        console.log('Debug: Updated yearlyLessons');
      }
      if (!isEqual(allerleiLessons, data.allerleiLessonsData || [])) {
        setAllerleiLessons(data.allerleiLessonsData || []);
        console.log('Debug: Updated allerleiLessons');
      }
      if (!isEqual(topics, data.topicsData || [])) {
        setTopics(data.topicsData || []);
        console.log('Debug: Updated topics');
      }
      if (!isEqual(classes, data.classesData || [])) {
        setClasses(data.classesData || []);
        console.log('Debug: Updated classes');
      }
      if (!isEqual(holidays, data.holidaysData || [])) {
        setHolidays(data.holidaysData || []);
        console.log('Debug: Updated holidays');
      }

      let localActiveClassId = activeClassId;
      if (data.classesData.length > 0 && !activeClassId) {
        localActiveClassId = data.classesData[0].id;
        setActiveClassId(localActiveClassId);
        console.log('Debug: Set activeClassId to', localActiveClassId);
      }

      if (localActiveClassId) {
        const filteredSubjects = data.subjectsData?.filter(s => s.class_id === localActiveClassId) || [];
        if (!isEqual(subjects, filteredSubjects)) {
          setSubjects(filteredSubjects);
          console.log('Debug: Set filtered subjects for class', localActiveClassId);
        }
      }

      if (Array.isArray(data.classesData) && data.classesData.length === 0) {
        try {
          const defaultClass = await Class.create({
            name: 'Default Klasse',
            user_id: currentUserId,
            year: currentYear,
          });
          setClasses([defaultClass]);
          setActiveClassId(defaultClass.id);
          console.log('Debug: Created default class, setting activeClassId to', defaultClass.id);
          queryClientLocal.invalidateQueries(['timetableData', currentYear, currentWeek]);
          await refetch();
          import('react-hot-toast').then(({ toast }) => {
            toast.success('Default-Klasse erstellt. Stundenplan sollte nun laden.');
          });
        } catch (error) {
          console.error('Error creating default class:', error?.data ? JSON.stringify(error.data) : error.message);
          import('react-hot-toast').then(({ toast }) => {
            toast.error('Fehler beim Erstellen der Default-Klasse. Überprüfen Sie die Konsole.');
          });
        }
      }

      if (data.settingsData?.length > 0) {
        const latestSettings = data.settingsData.sort((a, b) => new Date(b.updated) - new Date(a.updated))[0];
        if (!isEqual(settings, latestSettings)) {
          setSettings(latestSettings);
          console.log('Debug: Updated settings');
        }
      } else {
        const defaultSettings = {
          user_id: currentUserId,
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
    setActiveClassId
  };
};

export default useTimetableData;