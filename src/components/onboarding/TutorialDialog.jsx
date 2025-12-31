import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * Wiederverwendbare Tutorial-Dialog Komponente
 *
 * Props:
 * - isOpen: boolean - Ob der Dialog geöffnet ist
 * - onClose: () => void - Callback beim Schliessen
 * - onComplete: () => void - Callback beim Abschliessen
 * - title: string - Titel des Tutorials
 * - slides: Array<{ id, title, content, animation, icon? }> - Die Tutorial-Slides
 * - renderAnimation: (type, isActive) => ReactNode - Optional: Custom Animation Renderer
 */
export function TutorialDialog({
  isOpen,
  onClose,
  onComplete,
  title,
  slides,
  renderAnimation,
}) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Reset slide index when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const currentSlideData = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstSlide) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlide, isLastSlide]);

  if (!currentSlideData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 p-0">
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </DialogTitle>
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Schritt {currentSlide + 1} von {slides.length}
            </div>
            <div className="flex gap-1">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors duration-200 hover:opacity-80 ${
                    index === currentSlide
                      ? 'bg-blue-500'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  aria-label={`Gehe zu Schritt ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Slide Title */}
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                {currentSlideData.icon && (
                  <span className="text-blue-500">{currentSlideData.icon}</span>
                )}
                {currentSlideData.title}
              </h3>

              {/* Slide Content */}
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {currentSlideData.content}
              </p>

              {/* Animation Demo */}
              {renderAnimation && currentSlideData.animation && (
                <div className="mt-4">
                  {renderAnimation(currentSlideData.animation, true)}
                </div>
              )}

              {/* Keyboard Shortcuts Hint (optional) */}
              {currentSlideData.shortcuts && (
                <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Tastaturkürzel:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentSlideData.shortcuts.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <kbd className="px-2 py-1 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 font-mono">
                          {shortcut.key}
                        </kbd>
                        <span>{shortcut.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            Überspringen
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstSlide}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Zurück
            </Button>
            <Button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLastSlide ? 'Abschliessen' : 'Weiter'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TutorialDialog;
