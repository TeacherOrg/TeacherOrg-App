import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getWeekInfo, generateTimeSlots } from '../utils/timetableUtils';

const useTimetableStates = (settings, currentYear, currentWeek) => {
  const [renderKey, setRenderKey] = useState(0);
  const [viewMode, setViewMode] = useState('week');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [slotInfo, setSlotInfo] = useState({ day: null, period: null });
  const [currentView, setCurrentView] = useState('Woche');
  const [initialSubjectForModal, setInitialSubjectForModal] = useState(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copiedLesson, setCopiedLesson] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const [hoverLesson, setHoverLesson] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ top: 0, left: 0 });
  const [disableHover, setDisableHover] = useState(false);
  const overlayRef = useRef(null);
  const debouncedShowRef = useRef(null);
  const debouncedHideRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [autoFit, setAutoFit] = useState(settings.autoFit ?? true); // Neu: Auto-Fit-Flag aus Settings

  const timeSlots = useMemo(() => generateTimeSlots(settings), [settings]);
  const weekInfo = useMemo(() => getWeekInfo(currentWeek, currentYear), [currentWeek, currentYear]);

  useEffect(() => {
    const handleResize = () => {
      if (settings.cellHeight && timeSlots?.length > 0) {
        const maxHeightPerCell = Math.min(settings.cellHeight, Math.floor((window.innerHeight - 280) / timeSlots.length));
        document.documentElement.style.setProperty('--cell-height', `${maxHeightPerCell}px`);
      }
    };
    window.addEventListener('resize', handleResize);
    document.documentElement.style.setProperty('--cell-width', `${settings.cellWidth || 120}px`);
    document.documentElement.style.setProperty('--cell-height', `${settings.cellHeight || 80}px`);
    return () => window.removeEventListener('resize', handleResize);
  }, [settings.cellWidth, settings.cellHeight, timeSlots.length]);

  useEffect(() => {
    const updateCellSizes = () => {
      // Höhe
      const headerHeight = 280;
      const footerSpace = 50;
      const availableHeight = window.innerHeight - headerHeight - footerSpace;
      const numSlots = timeSlots.length || 8;
      const maxHeightPerCell = Math.floor(availableHeight / numSlots) - 5;
      const preferredHeight = settings.cellHeight || 80;
      const effectiveHeight = autoFit ? Math.min(preferredHeight, maxHeightPerCell) : preferredHeight;
      document.documentElement.style.setProperty('--cell-height', `${Math.max(40, effectiveHeight)}px`);

      // Breite
      const poolWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pool-width')) || 200;
      const contentPadding = 16 * 2;
      const gap = 16;
      const timeColumnWidth = 120;
      const reservedSpace = poolWidth + contentPadding + gap + timeColumnWidth;
      const availableWidthForDays = window.innerWidth - reservedSpace;
      const maxWidthPerCell = Math.floor(availableWidthForDays / 5);
      const preferredWidth = settings.cellWidth || 120;
      const effectiveWidth = autoFit ? Math.min(preferredWidth, maxWidthPerCell) : Math.min(preferredWidth, maxWidthPerCell);
      document.documentElement.style.setProperty('--cell-width', `${Math.max(60, effectiveWidth)}px`);
    };

    updateCellSizes();
    const resizeListener = () => updateCellSizes();
    window.addEventListener('resize', resizeListener);
    return () => window.removeEventListener('resize', resizeListener);
  }, [settings.cellHeight, settings.cellWidth, settings.autoFit, timeSlots.length]);

  useEffect(() => {
    if (currentView === 'Tag') {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get('date');
      if (dateParam) {
        const newDate = new Date(dateParam);
        if (!isNaN(newDate.getTime())) {
          setCurrentDate(newDate);
        }
      }
    }
  }, [currentView]);

  const handleShowHover = (lesson, event) => {
    if (disableHover) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      top: rect.top + window.scrollY,
      left: rect.right + window.scrollX + 10,
    };
    debouncedShowRef.current(lesson, position);
  };

  const handleHideHover = useCallback(() => {
    if (debouncedHideRef.current) debouncedHideRef.current();
  }, []);

  return {
    renderKey, setRenderKey,
    viewMode, setViewMode,
    isModalOpen, setIsModalOpen,
    editingLesson, setEditingLesson,
    slotInfo, setSlotInfo,
    currentView, setCurrentView,
    initialSubjectForModal, setInitialSubjectForModal,
    isCopying, setIsCopying,
    copiedLesson, setCopiedLesson,
    activeDragId, setActiveDragId,
    hoverLesson, setHoverLesson,
    hoverPosition, setHoverPosition,
    disableHover, setDisableHover,
    overlayRef,
    debouncedShowRef,
    debouncedHideRef,
    handleShowHover,
    handleHideHover,
    currentDate, setCurrentDate,
    timeSlots,
    weekInfo,
    autoFit,
    setAutoFit,
  };
};

export default useTimetableStates;