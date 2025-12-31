import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users } from 'lucide-react';

/**
 * Animierte Demo-Komponente für Tutorials
 * Zeigt visuelle Animationen zur Veranschaulichung von Features
 */
export function AnimatedDemo({ type, isActive }) {
  const baseClasses = "relative w-full h-40 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600";

  const renderAnimation = () => {
    switch (type) {
      case 'welcome':
        return (
          <div className="flex items-center justify-center h-full">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={isActive ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center"
            >
              <Calendar className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={isActive ? { y: 0, opacity: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-slate-900 dark:text-white text-lg font-semibold"
              >
                Flexibler Stundenplan
              </motion.div>
            </motion.div>
          </div>
        );

      case 'dragFromPool':
        return (
          <div className="flex h-full">
            {/* Stundenplan: 2x2 Grid */}
            <div className="flex-1 p-2">
              <div className="grid grid-cols-2 gap-1 h-full">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 relative">
                    {i === 1 && isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 1.5 }}
                        className="absolute inset-1 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold"
                      >
                        Mathe
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Pool */}
            <div className="w-16 p-2 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center mb-1">Pool</div>
              <motion.div
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={isActive ? { x: -60, y: -20, opacity: 0 } : {}}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-blue-500 rounded p-1 text-white text-xs text-center font-bold h-8 flex items-center justify-center"
              >
                Mathe
              </motion.div>
              <div className="bg-slate-300 dark:bg-slate-600 rounded p-1 text-slate-700 dark:text-white text-xs text-center font-bold h-8 flex items-center justify-center">
                Deutsch
              </div>
            </div>
          </div>
        );

      case 'moveLessons':
        return (
          <div className="flex h-full">
            {/* Stundenplan */}
            <div className="flex-1 p-2">
              <div className="grid grid-cols-2 gap-1 h-full relative">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 relative">
                    {i === 0 && (
                      <motion.div
                        initial={{ opacity: 1 }}
                        animate={isActive ? { opacity: 0 } : { opacity: 1 }}
                        transition={{ duration: 0.2, delay: 1.0 }}
                        className="absolute inset-1 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold"
                      >
                        Deutsch
                      </motion.div>
                    )}
                    {i === 3 && isActive && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 2.2 }}
                        className="absolute inset-1 bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold"
                      >
                        Deutsch
                      </motion.div>
                    )}
                  </div>
                ))}

                {isActive && (
                  <motion.div
                    initial={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      width: 'calc(50% - 10px)',
                      height: 'calc(50% - 10px)',
                      opacity: 0
                    }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      top: 'calc(50% + 2px)',
                      left: 'calc(50% + 2px)',
                    }}
                    transition={{
                      duration: 1.2,
                      delay: 1.1,
                      ease: "easeInOut",
                      times: [0, 0.1, 0.9, 1]
                    }}
                    className="bg-green-500 rounded text-white text-xs flex items-center justify-center font-bold z-10"
                  >
                    Deutsch
                  </motion.div>
                )}
              </div>
            </div>
            {/* Pool */}
            <div className="w-16 p-2 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center mb-1">Pool</div>
              <div className="bg-slate-300 dark:bg-slate-600 rounded p-1 text-slate-700 dark:text-white text-xs text-center font-bold h-8 flex items-center justify-center">
                Sport
              </div>
            </div>
          </div>
        );

      case 'doubleLessons':
        return (
          <div className="flex h-full">
            {/* Stundenplan */}
            <div className="flex-1 p-2">
              <div className="grid grid-cols-2 gap-1 h-full">
                <div className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 relative">
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={isActive ? { opacity: 0 } : { opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.0 }}
                    className="absolute inset-1 bg-purple-500 rounded text-white text-xs flex items-center justify-center font-bold"
                  >
                    Sport
                  </motion.div>

                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, height: "calc(100% - 8px)" }}
                      animate={{
                        opacity: 1,
                        height: "calc(200% + 4px)"
                      }}
                      transition={{ duration: 0.8, delay: 1.2 }}
                      className="absolute inset-x-1 top-1 bg-purple-500 rounded text-white text-xs flex items-center justify-center font-bold z-10"
                    >
                      Sport 2h
                    </motion.div>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"></div>
                <div className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"></div>
                <div className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"></div>
              </div>
            </div>
            {/* Pool */}
            <div className="w-16 p-2 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center mb-1">Pool</div>
              <div className="bg-slate-300 dark:bg-slate-600 rounded p-1 text-slate-700 dark:text-white text-xs text-center font-bold h-8 flex items-center justify-center">
                Mathe
              </div>
            </div>
          </div>
        );

      case 'allerleiLessons':
        return (
          <div className="flex h-full">
            {/* Stundenplan */}
            <div className="flex-1 p-2">
              <div className="grid grid-cols-2 gap-1 h-full">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 relative">
                    {i === 1 && (
                      <div className="absolute inset-1 rounded text-white text-xs flex items-center justify-center font-bold">
                        <motion.div
                          initial={{ opacity: 1 }}
                          animate={isActive ? { opacity: 0 } : { opacity: 1 }}
                          transition={{ duration: 0.5, delay: 1.0 }}
                          className="absolute inset-0 bg-blue-500 rounded flex items-center justify-center"
                        >
                          Mathematik
                        </motion.div>

                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 1.5 }}
                            className="absolute inset-0 rounded flex items-center justify-center"
                            style={{
                              background: 'linear-gradient(45deg, #3b82f6 0%, #06b6d4 50%, #10b981 100%)'
                            }}
                          >
                            Allerlei
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Pool */}
            <div className="w-16 p-2 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center mb-1">Pool</div>
              <div className="bg-slate-300 dark:bg-slate-600 rounded p-1 text-slate-700 dark:text-white text-xs text-center font-bold h-8 flex items-center justify-center">
                Sport
              </div>
            </div>
          </div>
        );

      case 'specialTypes':
        return (
          <div className="flex h-full">
            {/* Stundenplan */}
            <div className="flex-1 p-2">
              <div className="grid grid-cols-2 gap-1 h-full">
                {/* Halbklassen-Lektion */}
                <div className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 relative overflow-hidden">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={isActive ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="absolute inset-0 bg-orange-500 rounded text-white text-xs font-bold flex items-center justify-center"
                  >
                    <span>Mathe</span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={isActive ? { scale: 1 } : {}}
                      transition={{ duration: 0.4, delay: 0.8 }}
                      className="absolute top-1 right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border border-white dark:border-slate-800"
                    >
                      <Users className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  </motion.div>
                </div>

                {/* Prüfungs-Lektion */}
                <div className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 relative overflow-hidden">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={isActive ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 1.0 }}
                    className="absolute inset-0 bg-blue-500 rounded text-white text-xs font-bold flex items-center justify-center border-2 border-red-500"
                  >
                    <span>Deutsch</span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={isActive ? { scale: 1 } : {}}
                      transition={{ duration: 0.4, delay: 1.3 }}
                      className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border border-white dark:border-slate-800"
                    >
                      <span className="text-white text-xs font-bold">!</span>
                    </motion.div>
                  </motion.div>
                </div>

                <div className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"></div>
                <div className="bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"></div>
              </div>
            </div>
            {/* Pool */}
            <div className="w-16 p-2 space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center mb-1">Pool</div>
              <div className="bg-slate-300 dark:bg-slate-600 rounded p-1 text-slate-700 dark:text-white text-xs text-center font-bold h-8 flex items-center justify-center">
                Sport
              </div>
            </div>
          </div>
        );

      case 'yearlyConnection':
        return (
          <div className="flex h-full items-center justify-center">
            <div className="flex items-center gap-4">
              {/* Jahresansicht */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={isActive ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Jahresplan</div>
                <div className="space-y-1">
                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">L1</div>
                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">L2</div>
                  <div className="bg-blue-400 text-white text-xs px-2 py-1 rounded">L3</div>
                </div>
              </motion.div>

              {/* Pfeil */}
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={isActive ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-blue-500 text-2xl"
              >
                →
              </motion.div>

              {/* Pool */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={isActive ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 1 }}
                className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Pool</div>
                <div className="space-y-1">
                  <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded">Mathe L1</div>
                  <div className="bg-green-500 text-white text-xs px-2 py-1 rounded">Deutsch L1</div>
                </div>
              </motion.div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={baseClasses}>
      {renderAnimation()}
    </div>
  );
}

export default AnimatedDemo;
