import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@radix-ui/react-portal';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTour } from './TourProvider';

export function TourSpotlight() {
  const { activeTour, currentStep, nextStep, previousStep, skipTour } = useTour();
  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const observerRef = useRef(null);

  const step = activeTour?.steps[currentStep];

  useEffect(() => {
    if (!step) return;

    // Handle dialog-type steps (no target element)
    if (step.type === 'dialog') {
      setTargetRect(null);
      return;
    }

    if (!step.target) return;

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      console.warn(`[TourSpotlight] Target not found: ${step.target}`);
      if (step.optional) {
        console.log('[TourSpotlight] Auto-skipping optional step');
        nextStep(); // Auto-skip optional steps
      }
      return;
    }

    // Scroll into view
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Call onEnter callback
    if (step.onEnter) {
      step.onEnter(targetElement);
    }

    // Update position
    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      const tooltipPos = calculateTooltipPosition(rect, step.placement);
      setTooltipPosition(tooltipPos);
    };

    updatePosition();

    // Observe element for changes
    observerRef.current = new ResizeObserver(updatePosition);
    observerRef.current.observe(targetElement);

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [step, nextStep]);

  if (!activeTour || !step) return null;

  // Dialog-type steps (no spotlight, just a centered dialog)
  if (step.type === 'dialog') {
    return (
      <Portal>
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center"
            style={{ pointerEvents: 'auto' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
            >
              <button
                onClick={skipTour}
                className="absolute top-2 right-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{step.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                {step.content}
              </p>

              {/* Progress dots */}
              <div className="flex items-center gap-1 mb-4">
                {activeTour.steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 rounded-full transition-all ${
                      idx === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-slate-300'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  Schritt {currentStep + 1} von {activeTour.steps.length}
                </span>
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button variant="outline" size="sm" onClick={previousStep}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
                    </Button>
                  )}
                  <Button size="sm" onClick={nextStep}>
                    {currentStep === activeTour.steps.length - 1 ? 'Fertig' : 'Weiter'}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </Portal>
    );
  }

  // Regular spotlight steps
  if (!targetRect) return null;

  return (
    <Portal>
      <AnimatePresence>
        {/* Dark overlay with spotlight cutout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999]"
          style={{
            pointerEvents: 'none',
            background: `radial-gradient(
              circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px,
              transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 10}px,
              rgba(0, 0, 0, 0.7) ${Math.max(targetRect.width, targetRect.height) / 2 + 50}px
            )`
          }}
        />

        {/* Highlight border around target */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="fixed border-4 border-blue-500 rounded-lg pointer-events-none z-[10000]"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px rgba(59, 130, 246, 0.8)'
          }}
        />

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed z-[10001] bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 max-w-md pointer-events-auto"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left
          }}
        >
          <button
            onClick={skipTour}
            className="absolute top-2 right-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{step.title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            {step.content}
          </p>

          {/* Progress dots */}
          <div className="flex items-center gap-1 mb-4">
            {activeTour.steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 rounded-full transition-all ${
                  idx === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">
              Schritt {currentStep + 1} von {activeTour.steps.length}
            </span>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="outline" size="sm" onClick={previousStep}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
                </Button>
              )}
              <Button size="sm" onClick={nextStep}>
                {currentStep === activeTour.steps.length - 1 ? 'Fertig' : 'Weiter'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}

function calculateTooltipPosition(rect, placement) {
  const padding = 20;
  const tooltipWidth = 400; // max-w-md
  const tooltipHeight = 200; // estimated

  switch (placement) {
    case 'top':
      return {
        top: Math.max(padding, rect.top - tooltipHeight - padding),
        left: Math.max(padding, Math.min(
          window.innerWidth - tooltipWidth - padding,
          rect.left + rect.width / 2 - tooltipWidth / 2
        ))
      };
    case 'bottom':
      return {
        top: Math.min(window.innerHeight - tooltipHeight - padding, rect.bottom + padding),
        left: Math.max(padding, Math.min(
          window.innerWidth - tooltipWidth - padding,
          rect.left + rect.width / 2 - tooltipWidth / 2
        ))
      };
    case 'left':
      return {
        top: Math.max(padding, rect.top + rect.height / 2 - tooltipHeight / 2),
        left: Math.max(padding, rect.left - tooltipWidth - padding)
      };
    case 'right':
      return {
        top: Math.max(padding, rect.top + rect.height / 2 - tooltipHeight / 2),
        left: Math.min(window.innerWidth - tooltipWidth - padding, rect.right + padding)
      };
    case 'center':
      return {
        top: window.innerHeight / 2 - tooltipHeight / 2,
        left: window.innerWidth / 2 - tooltipWidth / 2
      };
    default:
      return {
        top: rect.bottom + padding,
        left: Math.max(padding, Math.min(
          window.innerWidth - tooltipWidth - padding,
          rect.left
        ))
      };
  }
}
