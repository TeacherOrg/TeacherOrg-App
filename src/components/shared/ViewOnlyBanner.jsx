import React from 'react';
import { Eye, Info } from 'lucide-react';

/**
 * Banner der angezeigt wird, wenn eine geteilte Klasse im Nur-Einsicht-Modus aktiv ist
 */
export default function ViewOnlyBanner({ activeClass, ownerEmail }) {
  // Nur anzeigen wenn es eine geteilte Klasse mit view_only ist
  if (!activeClass || activeClass.isOwner !== false || activeClass.permissionLevel !== 'view_only') {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-3 py-2 px-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-b border-amber-200 dark:border-amber-700">
      <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="text-sm text-amber-800 dark:text-amber-200">
        <strong>Nur Einsicht:</strong> Du siehst Klasse "{activeClass.name}" im Team Teaching Modus.
        {ownerEmail && (
          <span className="text-amber-600 dark:text-amber-400 ml-1">
            (Geteilt von {ownerEmail})
          </span>
        )}
      </span>
      <Info className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 cursor-help" title="Du kannst Daten einsehen, aber nicht bearbeiten." />
    </div>
  );
}
