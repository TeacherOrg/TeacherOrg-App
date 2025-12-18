import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'; // Adjust import path if needed
import { Button } from '@/components/ui/button'; // Assume you have a Button component

const UpdateModal = ({ isOpen, onClose, version }) => {
  // Structured updates with categories and sub-items
  // Each item has a 'text' and optional 'type' ('fixed', 'not-fixed', 'warning')
  const updates = [
    {
      category: 'Änderungen',
      subcategories: [
        {
          subcategory: 'Allgemein',
          items: [
            { text: 'OliOmegaGay', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Leistungsansicht',
          items: [
            { text: 'Achtung: Prüfungsgewichtung muss eingegeben werden', type: 'warning' },
            { text: 'Notenschnittberechnungen korrigiert', type: 'fixed' },
            { text: 'Klassendurchschnittsfarbe angepasst für bessere Lesbarkeit', type: 'fixed' },
            { text: 'Weitere Leistungsansicht-Verbesserungen', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Wochenansicht',
          items: [
            { text: 'Allerleierstellung bestehender Lektionen mit alt+Drag', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Jahresansicht',
          items: [
            { text: 'Rechtsklick auf Zelle öffnet Menü zum Verschieben + Kopieren', type: 'fixed' },
            { text: 'Shortcuts für Lektionszellen ohne Themen (Verschieben, Kopieren)', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Themenansicht',
          items: [
            { text: 'Themenzuweisung bestehender Lektionen', type: 'fixed' },
            { text: 'Themenspezifische Materialien speichern für Bearbeitungsmenü', type: 'fixed' },
            { text: 'Thema löschen = Löschen aller zugehörigen Lektionen', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Lektionsbearbeitungsmenü',
          items: [
            { text: 'Materialien aus Thema stehen bei den Schritten zur Verfügung ', type: 'fixed' },
            { text: 'Lektionstemplates können erstellt werden und erlauben hinzufügen neuer Lektionen', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Neue Schüleransicht',
          items: [
            { text: 'Zeigt Überblick der Schüler mit den Stärken und Schwächen', type: 'fixed' },
            { text: 'Notenschnittberechnungen korrigiert', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Hilfebereich',
          items: [
            { text: 'Kurzanleitungen in Einstellungsmenü "Hilfe"', type: 'fixed' },
            { text: 'Shortcuts für häufige Aktionen aufgeführt', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Lehrplankompetenzen',
          items: [
            { text: 'Testphase', type: 'warning' },
          ],
        },
      ],
    },
    {
      category: 'Nächste Updates',
      subcategories: [
        {
          subcategory: 'Geplante Änderungen',
          items: [
            { text: 'Jahrestabelle optimieren', type: 'not-fixed' },
            { text: 'Allerleilektionsmerging einfügen', type: 'not-fixed' },
            { text: 'Sofortige Titelübernahme LessonCard in Jahresansicht', type: 'not-fixed' },
          ],
        },
      ],
    },
  ];

  // Function to get the appropriate icon based on type
  const getIcon = (type) => {
    switch (type) {
      case 'fixed':
        return '✅ '; // Green checkmark (emoji for simplicity; you can replace with an icon component)
      case 'not-fixed':
        return '❌ '; // Red cross
      case 'warning':
        return '⚠️ '; // Yellow warning
      default:
        return ''; // No icon if type not specified
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>TeacherOrg Update: Version Alpha 4.2.0</DialogTitle>
          <DialogDescription>
            Hier sind die neuesten Änderungen:
          </DialogDescription>
        </DialogHeader>
        {/* Scrollbar-Bereich */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-6 pr-2">
          {updates.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="font-bold text-lg">{section.category}</h3>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                {section.subcategories.map((subcat, subcatIndex) => (
                  <li key={subcatIndex}>
                    <span className="font-semibold">{subcat.subcategory}:</span>
                    <ul className="list-disc pl-5 mt-1">
                      {subcat.items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          {getIcon(item.type)}
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {/* Button bleibt unten fixiert */}
        <div className="mt-6">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Verstanden
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateModal;