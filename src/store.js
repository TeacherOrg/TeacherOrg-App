import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

export const useLessonStore = create((set) => ({
  yearlyLessons: [],
  allLessons: [],
  allerleiLessons: [],
  topics: [], // Add topics state
  subjects: [], // Add subjects state
  classes: [], // Add classes state
  holidays: [], // Add holidays state
  settings: {}, // Add settings state
  setYearlyLessons: (lessons) => set({ yearlyLessons: lessons.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })) }),
  setAllLessons: (lessons) => set({ allLessons: lessons }),
  setAllerleiLessons: (lessons) => set({ allerleiLessons: lessons }),
  setTopics: (topics) => set({ topics }), // Add setTopics
  setSubjects: (subjects) => set({ subjects }), // Add setSubjects
  setClasses: (classes) => set({ classes }), // Add setClasses
  setHolidays: (holidays) => set({ holidays }), // Add setHolidays
  setSettings: (settings) => set({ settings }), // Add setSettings
  updateYearlyLesson: (id, updates) => set((state) => ({
    yearlyLessons: state.yearlyLessons.map(l => l.id === id ? { ...l, ...updates } : l),
  })),
  updateAllLesson: (id, updates) => set((state) => ({
    allLessons: state.allLessons.map(l => l.id === id ? { ...l, ...updates } : l),
  })),
  updateAllerleiLesson: (id, updates) => set((state) => ({
    allerleiLessons: state.allerleiLessons.map(l => l.id === id ? { ...l, ...updates } : l),
  })),
  addYearlyLesson: (lesson) => set((state) => ({ yearlyLessons: [...state.yearlyLessons, { ...lesson, lesson_number: Number(lesson.lesson_number) }] })),
  addAllLesson: (lesson) => set((state) => ({ allLessons: [...state.allLessons, lesson] })),
  addAllerleiLesson: (lesson) => set((state) => ({ allerleiLessons: [...state.allerleiLessons, lesson] })),
  removeYearlyLesson: (id) => set((state) => ({ yearlyLessons: state.yearlyLessons.filter(l => l.id !== id) })),
  removeAllLesson: (id) => set((state) => ({ allLessons: state.allLessons.filter(l => l.id !== id) })),
  removeAllerleiLesson: (id) => set((state) => ({ allerleiLessons: state.allerleiLessons.filter(l => l.id !== id) })),
  optimisticUpdateYearlyLessons: (updatedLesson, isNew = false, isDelete = false) => set((state) => {
    if (!updatedLesson) {
      console.error('Error: updatedLesson is null or undefined in optimisticUpdateYearlyLessons');
      return state;
    }
    if (isDelete && !updatedLesson.id) {
      console.error('Error: Cannot delete lesson without id');
      return state;
    }
    let newLessons = [...state.yearlyLessons];
    if (isDelete) {
      newLessons = newLessons.filter(l => l.id !== updatedLesson.id);
    } else if (isNew) {
      newLessons.push({ ...updatedLesson, lesson_number: Number(updatedLesson.lesson_number || 1) });
    } else {
      newLessons = newLessons.map(l => l.id === updatedLesson.id ? { ...l, ...updatedLesson } : l);
    }
    return { yearlyLessons: newLessons };
  }),
  optimisticUpdateAllLessons: (updatedLesson, isNew = false, isDelete = false) => set((state) => {
    let newLessons = [...state.allLessons];
    if (isDelete) {
      newLessons = newLessons.filter(l => l.id !== updatedLesson.id);
    } else if (isNew) {
      newLessons.push(updatedLesson);
    } else {
      newLessons = newLessons.map(l => l.id === updatedLesson.id ? { ...l, ...updatedLesson } : l);
    }
    return { allLessons: newLessons };
  }),
  optimisticUpdateAllerleiLessons: (updatedLesson, isNew = false, isDelete = false) => set((state) => {
    let newLessons = [...state.allerleiLessons];
    if (isDelete) {
      newLessons = newLessons.filter(l => l.id !== updatedLesson.id);
    } else if (isNew) {
      newLessons.push(updatedLesson);
    } else {
      newLessons = newLessons.map(l => l.id === updatedLesson.id ? { ...l, ...updatedLesson } : l);
    }
    return { allerleiLessons: newLessons };
  }),
}));

// Selektive Selektoren für stabile Props
export const useYearlyLessons = () => useLessonStore((state) => state.yearlyLessons, shallow);
export const useAllLessons = () => useLessonStore((state) => state.allLessons, shallow);
export const useAllerleiLessons = () => useLessonStore((state) => state.allerleiLessons, shallow);
export const useTopics = () => useLessonStore((state) => state.topics, shallow); // Add selector for topics
export const useSubjects = () => useLessonStore((state) => state.subjects, shallow); // Add selector for subjects
export const useClasses = () => useLessonStore((state) => state.classes, shallow); // Add selector for classes
export const useHolidays = () => useLessonStore((state) => state.holidays, shallow); // Add selector for holidays
export const useSettings = () => useLessonStore((state) => state.settings, shallow); // Add selector for settings