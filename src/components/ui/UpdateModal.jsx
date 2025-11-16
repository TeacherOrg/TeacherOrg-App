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
            { text: 'OliGay', type: 'fixed' },
            { text: 'Neue Darkmodefarbe', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Wochenansicht',
          items: [
            { text: 'Diverse Verbesserungen (Grösseneinstellungen, Effizienz, Drag und Drop)', type: 'fixed' },
            { text: 'Halbklassenlektion werden korrekt kopiert und angezeigt', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Lektionsmodal',
          items: [
            { text: 'Scrollbar für Erweiterungen', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Jahresansicht',
          items: [
            { text: 'Fixe Fachzeile', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Neue Schüleransicht',
          items: [
            { text: 'Zeigt Überblick der Schüler mit den Stärken und Schwächen', type: 'fixed' },
          ],
        },
        {
          subcategory: 'Lehrplankompetenzen',
          items: [
            { text: 'Überfachliche Kompetenzen Bugfix', type: 'fixed' },
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>TeacherOrg Update: Version Alpha 2</DialogTitle>
          <DialogDescription>
            Hier sind die neuesten Änderungen:
            {updates.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mt-4">
                <h3 className="font-bold text-lg">{section.category}</h3>
                <ul className="list-disc pl-5 mt-2">
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
          </DialogDescription>
        </DialogHeader>
        <Button onClick={onClose}>Verstanden</Button>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateModal;