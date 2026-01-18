import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, Check, BookOpen, ChevronRight, ChevronLeft } from 'lucide-react';
import { Subject, Fachbereich, Setting, Performance } from '@/api/entities';
import pb from '@/api/pb';
import toast from 'react-hot-toast';
import {
  FACHBEREICHE_BY_SUBJECT,
  LEHRPLAN_ZYKLEN,
  suggestLp21Match,
  getFachbereicheForSubject,
  getSubjectsForZyklus
} from '@/constants/lehrplan21Subjects';

/**
 * SubjectMigrationModal
 *
 * Ermöglicht bestehenden Nutzern, ihre manuell erstellten Fächer
 * den vordefinierten Lehrplan 21 Fächern zuzuordnen.
 */
const SubjectMigrationModal = ({ isOpen, onClose, subjects, fachbereiche, onComplete }) => {
  const [step, setStep] = useState(1); // 1 = Zyklus, 2 = Fächer, 3 = Fachbereiche
  const [selectedZyklus, setSelectedZyklus] = useState('zyklus_2'); // Default: Zyklus 2
  const [subjectMappings, setSubjectMappings] = useState({});
  const [fachbereichMappings, setFachbereichMappings] = useState({});
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fächer ohne lp21_id (müssen migriert werden)
  const subjectsToMigrate = useMemo(() => {
    return subjects.filter(s => !s.lp21_id);
  }, [subjects]);

  // Fachbereiche die migriert werden können
  const fachbereicheToMigrate = useMemo(() => {
    return fachbereiche.filter(fb => !fb.lp21_id);
  }, [fachbereiche]);

  // LP21 Fächer gefiltert nach gewähltem Zyklus
  const filteredLp21Subjects = useMemo(() => {
    return getSubjectsForZyklus(selectedZyklus);
  }, [selectedZyklus]);

  // Initialisiere Mappings mit intelligenten Vorschlägen (nur für Fächer im Zyklus)
  useEffect(() => {
    if (isOpen && subjectsToMigrate.length > 0 && step === 2) {
      const initialMappings = {};
      subjectsToMigrate.forEach(subject => {
        const suggestion = suggestLp21Match(subject.name);
        // Prüfe ob der Vorschlag im gewählten Zyklus verfügbar ist
        if (suggestion && filteredLp21Subjects.some(s => s.lp21_id === suggestion.lp21_id)) {
          initialMappings[subject.id] = suggestion.lp21_id;
        } else {
          initialMappings[subject.id] = 'keep_custom';
        }
      });
      setSubjectMappings(initialMappings);
    }
  }, [isOpen, subjectsToMigrate, step, filteredLp21Subjects]);

  // Initialisiere Fachbereich-Mappings
  useEffect(() => {
    if (step === 3 && fachbereicheToMigrate.length > 0) {
      const initialFbMappings = {};
      fachbereicheToMigrate.forEach(fb => {
        // Finde das zugeordnete LP21-Fach für diesen Fachbereich
        const parentSubject = subjects.find(s => s.id === fb.subject_id);
        const lp21Id = parentSubject?.lp21_id || subjectMappings[parentSubject?.id];

        if (lp21Id && lp21Id !== 'keep_custom' && FACHBEREICHE_BY_SUBJECT[lp21Id]) {
          // Versuche eine Übereinstimmung zu finden
          const predefinedFbs = FACHBEREICHE_BY_SUBJECT[lp21Id];
          const match = predefinedFbs.find(pfb =>
            pfb.name.toLowerCase() === fb.name.toLowerCase() ||
            pfb.id === fb.name.toLowerCase().replace(/\s+/g, '_')
          );
          initialFbMappings[fb.id] = match ? match.id : 'keep_custom';
        } else {
          initialFbMappings[fb.id] = 'keep_custom';
        }
      });
      setFachbereichMappings(initialFbMappings);
    }
  }, [step, fachbereicheToMigrate, subjects, subjectMappings]);

  // LP21 Fächer als Optionen (gefiltert nach Zyklus)
  const lp21Options = useMemo(() => {
    return [
      { lp21_id: 'keep_custom', name: '— Als benutzerdefiniert behalten —' },
      ...filteredLp21Subjects.map(s => ({
        lp21_id: s.lp21_id,
        name: `${s.emoji} ${s.name}${s.fullName ? ` (${s.fullName})` : ''}`
      }))
    ];
  }, [filteredLp21Subjects]);

  // Fachbereich-Optionen für ein bestimmtes LP21-Fach
  const getFachbereichOptions = (lp21Id) => {
    if (!lp21Id || lp21Id === 'keep_custom') return [];
    const predefinedFbs = FACHBEREICHE_BY_SUBJECT[lp21Id] || [];
    return [
      { id: 'keep_custom', name: '— Als benutzerdefiniert behalten —' },
      ...predefinedFbs.map(fb => ({
        id: fb.id,
        name: fb.name
      }))
    ];
  };

  // Update Subject Mapping
  const updateSubjectMapping = (subjectId, lp21Id) => {
    setSubjectMappings(prev => ({
      ...prev,
      [subjectId]: lp21Id
    }));
  };

  // Update Fachbereich Mapping
  const updateFachbereichMapping = (fbId, lp21FbId) => {
    setFachbereichMappings(prev => ({
      ...prev,
      [fbId]: lp21FbId
    }));
  };

  // Speichern der Migration
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const currentUserId = pb.authStore.model?.id;

      // 1. Fächer aktualisieren
      for (const [subjectId, lp21Id] of Object.entries(subjectMappings)) {
        if (lp21Id && lp21Id !== 'keep_custom') {
          await Subject.update(subjectId, { lp21_id: lp21Id });
        }
      }

      // 2. Fachbereiche migrieren (ersetzen statt duplizieren)
      for (const [subjectId, lp21Id] of Object.entries(subjectMappings)) {
        if (lp21Id && lp21Id !== 'keep_custom') {
          const subject = subjects.find(s => s.id === subjectId);
          const existingFbs = fachbereiche.filter(fb => fb.subject_id === subjectId);
          const lp21Fachbereiche = getFachbereicheForSubject(lp21Id);

          // Sammle welche LP21-Fachbereiche durch gemappte ersetzt werden
          const mappedLp21FbIds = new Set();
          for (const [fbId, lp21FbId] of Object.entries(fachbereichMappings)) {
            if (lp21FbId && lp21FbId !== 'keep_custom') {
              const fb = existingFbs.find(f => f.id === fbId);
              if (fb) {
                mappedLp21FbIds.add(lp21FbId);
              }
            }
          }

          // 2a. Gemappte Fachbereiche aktualisieren (umbenennen + lp21_id)
          for (const [fbId, lp21FbId] of Object.entries(fachbereichMappings)) {
            if (lp21FbId && lp21FbId !== 'keep_custom') {
              const existingFb = existingFbs.find(f => f.id === fbId);
              if (existingFb) {
                const lp21Fb = lp21Fachbereiche.find(f => f.id === lp21FbId);
                if (lp21Fb) {
                  // Aktualisiere mit LP21-Name und ID
                  await Fachbereich.update(fbId, {
                    name: lp21Fb.name,
                    lp21_id: lp21FbId
                  });
                }
              }
            }
          }

          // 2b. Alte Fachbereiche ohne Mapping löschen (aber 'keep_custom' behalten)
          for (const fb of existingFbs) {
            const mapping = fachbereichMappings[fb.id];
            // Nur löschen wenn: kein lp21_id UND kein Mapping (nicht zugeordnet)
            // 'keep_custom' bedeutet: Nutzer will es behalten
            if (!fb.lp21_id && !mapping) {
              // Performances aktualisieren die diesen Fachbereich referenzieren
              const performancesWithFb = await Performance.list({ fachbereich_id: fb.id });
              for (const perf of performancesWithFb) {
                await Performance.update(perf.id, { fachbereich_id: null });
              }
              // Fachbereich löschen
              await Fachbereich.delete(fb.id);
            }
          }

          // 2c. Fehlende LP21-Fachbereiche erstellen (nur wenn nicht durch Mapping ersetzt)
          const remainingFbs = await Fachbereich.list({ subject_id: subjectId });
          const existingLp21Ids = remainingFbs.filter(f => f.lp21_id).map(f => f.lp21_id);

          for (let j = 0; j < lp21Fachbereiche.length; j++) {
            const lp21Fb = lp21Fachbereiche[j];
            if (!existingLp21Ids.includes(lp21Fb.id)) {
              await Fachbereich.create({
                name: lp21Fb.name,
                subject_id: subjectId,
                class_id: subject?.class_id,
                user_id: currentUserId,
                lp21_id: lp21Fb.id,
                sort_order: remainingFbs.length + j
              });
            }
          }
        }
      }

      // 3. Migration als abgeschlossen markieren
      if (dontShowAgain) {
        if (currentUserId) {
          const settingsList = await Setting.list({ user_id: currentUserId });
          if (settingsList.length > 0) {
            await Setting.update(settingsList[0].id, {
              subject_migration_completed: true
            });
          }
        }
      }

      toast.success('Migration abgeschlossen! Fachbereiche wurden ersetzt.');
      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Error during migration:', error);
      toast.error('Fehler bei der Migration: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Überspringen
  const handleSkip = async () => {
    if (dontShowAgain) {
      try {
        const currentUserId = pb.authStore.model?.id;
        if (currentUserId) {
          const settingsList = await Setting.list({ user_id: currentUserId });
          if (settingsList.length > 0) {
            await Setting.update(settingsList[0].id, {
              subject_migration_skipped: true
            });
          }
        }
      } catch (error) {
        console.error('Error saving skip preference:', error);
      }
    }
    onClose();
  };

  // Prüfe ob es Fachbereiche zu migrieren gibt
  const hasFachbereichsToMigrate = fachbereicheToMigrate.length > 0;
  const totalSteps = hasFachbereichsToMigrate ? 3 : 2; // 1=Zyklus, 2=Fächer, 3=Fachbereiche (optional)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            Migration zu Lehrplan 21 Fächern
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            {step === 1 && 'Wählen Sie zuerst den Zyklus für Ihre Klasse.'}
            {step === 2 && 'Ordnen Sie Ihre bestehenden Fächer den Lehrplan 21 Fächern zu.'}
            {step === 3 && 'Ordnen Sie Ihre Fachbereiche den LP21-Kategorien zu.'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>
              1
            </div>
            <span className="text-xs text-slate-500 mt-1">Zyklus</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-300 dark:bg-slate-600 mb-5" />
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>
              2
            </div>
            <span className="text-xs text-slate-500 mt-1">Fächer</span>
          </div>
          {totalSteps >= 3 && (
            <>
              <div className="w-8 h-0.5 bg-slate-300 dark:bg-slate-600 mb-5" />
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 3 ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  3
                </div>
                <span className="text-xs text-slate-500 mt-1">Bereiche</span>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {step === 1 ? (
            // Schritt 1: Zyklus-Auswahl
            <div className="space-y-6">
              <div className="text-center mb-6">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Der Zyklus bestimmt, welche Lehrplan 21 Fächer verfügbar sind.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.values(LEHRPLAN_ZYKLEN).map(zyklus => (
                  <button
                    key={zyklus.id}
                    type="button"
                    onClick={() => setSelectedZyklus(zyklus.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedZyklus === zyklus.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        selectedZyklus === zyklus.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {zyklus.id.replace('zyklus_', '')}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {zyklus.name}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {zyklus.description}
                        </p>
                      </div>
                      {selectedZyklus === zyklus.id && (
                        <Check className="w-5 h-5 text-blue-500 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Hinweis:</strong> Im nächsten Schritt werden nur Fächer für {LEHRPLAN_ZYKLEN[selectedZyklus.toUpperCase()]?.name || 'den gewählten Zyklus'} angezeigt.
                </p>
              </div>
            </div>
          ) : step === 2 ? (
            // Schritt 2: Fächer-Migration
            <div className="space-y-4">
              <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400 text-center">
                  Fächer für <strong>{LEHRPLAN_ZYKLEN[selectedZyklus.toUpperCase()]?.name}</strong> ({LEHRPLAN_ZYKLEN[selectedZyklus.toUpperCase()]?.description})
                </p>
              </div>

              {subjectsToMigrate.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>Alle Fächer sind bereits zugeordnet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjectsToMigrate.map(subject => {
                    const currentMapping = subjectMappings[subject.id];
                    const suggestion = suggestLp21Match(subject.name);
                    const isAutoSuggested = suggestion &&
                      filteredLp21Subjects.some(s => s.lp21_id === suggestion.lp21_id) &&
                      currentMapping === suggestion.lp21_id;

                    return (
                      <div
                        key={subject.id}
                        className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {/* Bestehendes Fach */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: subject.color }}
                              />
                              <span className="text-lg">{subject.emoji || '📚'}</span>
                              <span className="font-medium text-slate-900 dark:text-white truncate">
                                {subject.name}
                              </span>
                            </div>
                          </div>

                          {/* Pfeil */}
                          <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

                          {/* LP21 Dropdown */}
                          <div className="flex-1 min-w-0">
                            <select
                              value={currentMapping || 'keep_custom'}
                              onChange={(e) => updateSubjectMapping(subject.id, e.target.value)}
                              className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                            >
                              {lp21Options.map(opt => (
                                <option key={opt.lp21_id} value={opt.lp21_id}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                            {isAutoSuggested && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                Automatisch vorgeschlagen
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            // Schritt 3: Fachbereiche-Migration
            <div className="space-y-4">
              {fachbereicheToMigrate.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                  <p>Alle Fachbereiche sind bereits zugeordnet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fachbereicheToMigrate.map(fb => {
                    const parentSubject = subjects.find(s => s.id === fb.subject_id);
                    const lp21Id = parentSubject?.lp21_id || subjectMappings[parentSubject?.id];
                    const fbOptions = getFachbereichOptions(lp21Id);
                    const currentMapping = fachbereichMappings[fb.id];

                    return (
                      <div
                        key={fb.id}
                        className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          {/* Bestehender Fachbereich */}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-slate-900 dark:text-white">
                              {fb.name}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Fach: {parentSubject?.name || 'Unbekannt'}
                            </p>
                          </div>

                          {/* Pfeil */}
                          <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />

                          {/* LP21 Fachbereich Dropdown */}
                          <div className="flex-1 min-w-0">
                            {fbOptions.length > 1 ? (
                              <select
                                value={currentMapping || 'keep_custom'}
                                onChange={(e) => updateFachbereichMapping(fb.id, e.target.value)}
                                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                              >
                                {fbOptions.map(opt => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-sm text-slate-500 dark:text-slate-400 italic">
                                Keine LP21-Kategorien verfügbar
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
          {/* Don't show again checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={setDontShowAgain}
            />
            <Label htmlFor="dont-show-again" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
              Nicht erneut anzeigen
            </Label>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-slate-500"
            >
              Überspringen
            </Button>

            <div className="flex gap-2">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Zurück
                </Button>
              )}

              {step < totalSteps ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Weiter
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? 'Wird gespeichert...' : 'Migration abschliessen'}
                  <Check className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubjectMigrationModal;
