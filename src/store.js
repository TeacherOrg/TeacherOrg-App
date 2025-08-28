// src/store.js (neu anlegen)
import { create } from 'zustand';

export const useLessonStore = create((set) => ({
  yearlyLessons: [],
  allLessons: [],
  setYearlyLessons: (lessons) => set({ yearlyLessons: lessons.map(l => ({ ...l, lesson_number: Number(l.lesson_number) })) }),
  setAllLessons: (lessons) => set({ allLessons: lessons }),
  updateYearlyLesson: (id, updates) => set((state) => ({
    yearlyLessons: state.yearlyLessons.map(l => l.id === id ? { ...l, ...updates } : l),
  })),
  updateAllLesson: (id, updates) => set((state) => ({
    allLessons: state.allLessons.map(l => l.id === id ? { ...l, ...updates } : l),
  })),
  addYearlyLesson: (lesson) => set((state) => ({ yearlyLessons: [...state.yearlyLessons, { ...lesson, lesson_number: Number(lesson.lesson_number) }] })),
  addAllLesson: (lesson) => set((state) => ({ allLessons: [...state.allLessons, lesson] })),
  removeYearlyLesson: (id) => set((state) => ({ yearlyLessons: state.yearlyLessons.filter(l => l.id !== id) })),
  removeAllLesson: (id) => set((state) => ({ allLessons: state.allLessons.filter(l => l.id !== id) })),
  optimisticUpdateYearlyLessons: (updatedLesson, isNew = false, isDelete = false) => set((state) => {
    let newLessons = [...state.yearlyLessons];
    if (isDelete) {
      newLessons = newLessons.filter(l => l.id !== updatedLesson.id);
    } else if (isNew) {
      newLessons.push({ ...updatedLesson, lesson_number: Number(updatedLesson.lesson_number) });
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
}));