import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Target, Star, ClipboardCheck, Trophy, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

// Helper: Get ISO week number
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Helper: Format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'short' });
  const day = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return `${weekday} ${day}`;
};

// Color helper for chore completion rate
const getChoreColor = (rate) => {
  if (rate >= 80) return { bg: 'from-green-500 to-emerald-600', text: 'text-white', icon: 'text-green-100' };
  if (rate >= 50) return { bg: 'from-yellow-500 to-amber-500', text: 'text-white', icon: 'text-yellow-100' };
  return { bg: 'from-red-500 to-rose-600', text: 'text-white', icon: 'text-red-100' };
};

const KompetenzenKPICards = ({
  ueberfachlich = [],
  students = [],
  choreAssignments = [],
  selectedStudents = [],
  onChoreUpdate
}) => {
  const [showChoresModal, setShowChoresModal] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState(new Set());

  // Detect single student mode
  const isSingleStudent = selectedStudents?.length === 1;
  const selectedStudentId = isSingleStudent ? selectedStudents[0] : null;

  const kpis = useMemo(() => {
    // Filter chores for selected student if in single student mode
    let relevantChores = choreAssignments;
    if (isSingleStudent && selectedStudentId) {
      relevantChores = choreAssignments.filter(a => a.student_id === selectedStudentId);
    }

    // Nur vergangene Ämtlis zählen (fair für die Quote)
    const today = new Date().toISOString().split('T')[0];
    const pastChores = relevantChores.filter(a => a.assignment_date <= today);
    const totalChores = pastChores.length;
    // Status-basierte Zählung mit Fallback für alte Daten
    const completedChores = pastChores.filter(a => {
      const status = a.status || (a.is_completed ? 'completed' : 'pending');
      return status === 'completed';
    }).length;
    const notCompletedChores = pastChores.filter(a => {
      const status = a.status || (a.is_completed ? 'completed' : 'pending');
      return status === 'not_completed';
    }).length;
    const choresRate = totalChores > 0 ? Math.round((completedChores / totalChores) * 100) : 0;

    // Group chores by week > date for modal display
    const choresByWeek = {};
    relevantChores.forEach(chore => {
      const date = chore.assignment_date || 'unknown';
      if (date === 'unknown') return;

      const weekNum = getWeekNumber(date);
      const year = new Date(date).getFullYear();
      const weekKey = `${year}-KW${weekNum}`;

      if (!choresByWeek[weekKey]) {
        choresByWeek[weekKey] = {
          weekNum,
          year,
          days: {}
        };
      }

      if (!choresByWeek[weekKey].days[date]) {
        choresByWeek[weekKey].days[date] = [];
      }

      // Add student name to chore
      const student = students.find(s => s.id === chore.student_id);
      choresByWeek[weekKey].days[date].push({
        ...chore,
        studentName: student?.name || 'Unbekannt'
      });
    });

    return {
      totalChores,
      completedChores,
      notCompletedChores,
      openChores: totalChores - completedChores - notCompletedChores,
      choresRate,
      choresByWeek,
      allChoresCount: relevantChores.length
    };
  }, [choreAssignments, students, isSingleStudent, selectedStudentId]);

  const choreColors = getChoreColor(kpis.choresRate);
  const placeholderColors = { bg: 'from-slate-400 to-slate-500', text: 'text-white', icon: 'text-slate-200' };

  const toggleWeek = (weekKey) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(weekKey)) {
        newSet.delete(weekKey);
      } else {
        newSet.add(weekKey);
      }
      return newSet;
    });
  };

  // Status-Cycling: completed → not_completed, andere → completed
  const handleChoreToggle = async (choreId, currentStatus) => {
    if (onChoreUpdate) {
      const newStatus = currentStatus === 'completed' ? 'not_completed' : 'completed';
      await onChoreUpdate(choreId, newStatus);
    }
  };

  const cards = [
    {
      id: 'placeholder1',
      title: 'Kompetenz-Schnitt',
      value: '—',
      subtitle: 'Kommt bald',
      icon: Target,
      colors: placeholderColors,
      clickable: false
    },
    {
      id: 'placeholder2',
      title: 'Selbsteinschätzung',
      value: '—',
      subtitle: 'Kommt bald',
      icon: Star,
      colors: placeholderColors,
      clickable: false
    },
    {
      id: 'placeholder3',
      title: 'Aktive Ziele',
      value: '—',
      subtitle: 'Kommt bald',
      icon: Trophy,
      colors: placeholderColors,
      clickable: false
    },
    {
      id: 'chores',
      title: 'Ämtlis erledigt',
      value: `${kpis.completedChores}/${kpis.totalChores}`,
      subtitle: `${kpis.choresRate}% Erfolgsquote`,
      icon: ClipboardCheck,
      colors: kpis.totalChores > 0 ? choreColors : placeholderColors,
      clickable: kpis.allChoresCount > 0,
      onClick: () => {
        // Expand the most recent week by default
        const weeks = Object.keys(kpis.choresByWeek).sort().reverse();
        if (weeks.length > 0) {
          setExpandedWeeks(new Set([weeks[0]]));
        }
        setShowChoresModal(true);
      }
    }
  ];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <motion.div
              whileHover={card.clickable ? { scale: 1.02, y: -2 } : {}}
              whileTap={card.clickable ? { scale: 0.98 } : {}}
              onClick={card.clickable ? card.onClick : undefined}
              className={card.clickable ? "cursor-pointer group h-full" : "h-full"}
            >
              <Card className={`relative overflow-hidden bg-gradient-to-br ${card.colors.bg} border-none shadow-md ${card.clickable ? 'hover:shadow-lg' : ''} transition-all duration-300 h-full`}>
                {card.clickable && (
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
                <CardContent className="p-3 relative z-10">
                  <div className="flex items-start justify-between mb-1">
                    <p className={`text-xs font-medium ${card.colors.text} opacity-90`}>
                      {card.title}
                    </p>
                    <card.icon className={`w-4 h-4 ${card.colors.icon} opacity-80`} />
                  </div>
                  <div className={`text-2xl font-bold ${card.colors.text}`}>
                    {card.value}
                  </div>
                  <p className={`text-xs ${card.colors.text} opacity-75 truncate`}>
                    {card.subtitle}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Chores Detail Modal */}
      <Dialog open={showChoresModal} onOpenChange={setShowChoresModal}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-orange-500" />
              Ämtli-Übersicht
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {kpis.completedChores} von {kpis.totalChores} Ämtlis erledigt ({kpis.choresRate}%)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis.completedChores}</div>
                <div className="text-xs text-green-700 dark:text-green-300">Erledigt</div>
              </div>
              <div className="text-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{kpis.notCompletedChores}</div>
                <div className="text-xs text-red-700 dark:text-red-300">Nicht erledigt</div>
              </div>
              <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{kpis.openChores}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Offen</div>
              </div>
            </div>

            {/* Chores by Week (Accordion) */}
            {Object.entries(kpis.choresByWeek)
              .sort(([a], [b]) => b.localeCompare(a)) // Newest first
              .map(([weekKey, weekData]) => {
                const isExpanded = expandedWeeks.has(weekKey);
                const weekChores = Object.values(weekData.days).flat();
                const weekCompleted = weekChores.filter(c => {
                  const status = c.status || (c.is_completed ? 'completed' : 'pending');
                  return status === 'completed';
                }).length;
                const weekTotal = weekChores.length;

                return (
                  <div key={weekKey} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    {/* Week Header */}
                    <button
                      onClick={() => toggleWeek(weekKey)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white">
                          KW {weekData.weekNum}
                        </span>
                      </div>
                      <Badge
                        variant={weekCompleted === weekTotal ? 'default' : 'outline'}
                        className={weekCompleted === weekTotal ? 'bg-green-500' : ''}
                      >
                        {weekCompleted}/{weekTotal}
                      </Badge>
                    </button>

                    {/* Week Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 space-y-3">
                            {Object.entries(weekData.days)
                              .sort(([a], [b]) => b.localeCompare(a))
                              .map(([date, dayChores]) => (
                                <div key={date}>
                                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                                    {formatDate(date)}
                                  </div>
                                  <div className="space-y-2 ml-3">
                                    {dayChores.map((chore) => {
                                      // Status mit Fallback für alte Daten
                                      const status = chore.status || (chore.is_completed ? 'completed' : 'pending');
                                      const bgClass = status === 'completed'
                                        ? 'bg-green-50 dark:bg-green-900/20'
                                        : status === 'not_completed'
                                          ? 'bg-red-50 dark:bg-red-900/20'
                                          : 'bg-slate-50 dark:bg-slate-800/30';
                                      const btnClass = status === 'completed'
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : status === 'not_completed'
                                          ? 'bg-red-500 hover:bg-red-600 text-white'
                                          : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300';
                                      const title = status === 'completed'
                                        ? 'Als nicht erledigt markieren'
                                        : 'Als erledigt markieren';

                                      return (
                                        <div
                                          key={chore.id}
                                          className={`flex items-center justify-between p-2 rounded-lg ${bgClass}`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="text-lg flex-shrink-0">
                                              {chore.expand?.chore_id?.icon || '📋'}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <p className="font-medium text-slate-900 dark:text-white text-sm truncate">
                                                {chore.chore_name || 'Ämtli'}
                                              </p>
                                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {chore.studentName}
                                              </p>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleChoreToggle(chore.id, status)}
                                            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${btnClass}`}
                                            title={title}
                                          >
                                            {status === 'completed' ? (
                                              <Check className="w-4 h-4" />
                                            ) : status === 'not_completed' ? (
                                              <X className="w-4 h-4" />
                                            ) : (
                                              <ClipboardCheck className="w-4 h-4" />
                                            )}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

            {kpis.allChoresCount === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Keine Ämtlis zugewiesen</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(KompetenzenKPICards);
