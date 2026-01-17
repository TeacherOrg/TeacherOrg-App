import React from 'react';
import { Button } from '@/components/ui/button';
import { Users2, Eye, AlertCircle } from 'lucide-react';

export default function ClassSelectorBar({ classes, activeClassId, onSelectClass }) {
  if (!classes || classes.length === 0) return null;

  // Klassen in Kategorien aufteilen
  const ownedClasses = classes.filter(c => c.isOwner !== false).sort((a, b) => a.name.localeCompare(b.name));
  const sharedClasses = classes.filter(c => c.isOwner === false).sort((a, b) => a.name.localeCompare(b.name));

  // Pruefen ob es geteilte Klassen gibt
  const hasSharedClasses = sharedClasses.length > 0;

  // Aktive Klasse finden fuer Banner
  const activeClass = classes.find(cls => cls.id === activeClassId);
  const isViewOnlyActive = activeClass?.isOwner === false && activeClass?.permissionLevel === 'view_only';

  return (
    <div className="flex flex-col">
      {/* View-Only Banner - nur wenn geteilte Klasse mit view_only aktiv */}
      {isViewOnlyActive && (
        <div className="flex items-center justify-center gap-3 py-2 px-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-amber-200 dark:border-amber-700">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Nur Einsicht:</strong> Du siehst Klasse "{activeClass.name}" im Team Teaching Modus. Bearbeiten ist nicht moeglich.
          </span>
        </div>
      )}

      {/* Klassen-Auswahl */}
      <div className="flex items-center justify-center gap-3 py-3 px-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-b-2 border-slate-200 dark:border-slate-600 shadow-sm">
      {/* "Alle" Button nur bei mehr als einer Klasse */}
      {classes.length > 1 && (
        <Button
          variant={activeClassId === null ? "default" : "outline"}
          size="lg"
          onClick={() => onSelectClass(null)}
          className="font-semibold whitespace-nowrap"
        >
          Alle Klassen
        </Button>
      )}

      {/* Eigene Klassen */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {ownedClasses.map((cls) => {
          const isActive = activeClassId === cls.id;
          return (
            <Button
              key={cls.id}
              variant={isActive ? "default" : "outline"}
              size="lg"
              onClick={() => onSelectClass(cls.id)}
              className="font-semibold min-w-28 whitespace-nowrap"
            >
              <span>{cls.name}</span>
            </Button>
          );
        })}
      </div>

      {/* Separator + Geteilte Klassen */}
      {hasSharedClasses && (
        <>
          <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 mx-2" />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap">
            Geteilte Klassen:
          </span>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {sharedClasses.map((cls) => {
              const isViewOnly = cls.permissionLevel === 'view_only';
              const isActive = activeClassId === cls.id;
              return (
                <Button
                  key={cls.id}
                  variant={isActive ? "default" : "outline"}
                  size="lg"
                  onClick={() => onSelectClass(cls.id)}
                  className={`font-semibold min-w-28 whitespace-nowrap ${
                    !isActive
                      ? 'border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                      : ''
                  }`}
                >
                  <span>{cls.name}</span>
                  <span className={`ml-2 flex items-center gap-1 text-xs ${
                    isActive ? 'text-white/80' : 'text-purple-600 dark:text-purple-400'
                  }`}>
                    {isViewOnly ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <Users2 className="w-3 h-3" />
                    )}
                    <span className="hidden sm:inline">
                      {isViewOnly ? 'Einsicht' : 'Geteilt'}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </>
      )}

      {/* Legende bei geteilten Klassen */}
      {hasSharedClasses && (
        <div className="hidden md:flex items-center gap-2 ml-2 text-xs text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-600 pl-3">
          <Eye className="w-3 h-3 text-purple-500" />
          <span>= Team Teaching</span>
        </div>
      )}
      </div>
    </div>
  );
}