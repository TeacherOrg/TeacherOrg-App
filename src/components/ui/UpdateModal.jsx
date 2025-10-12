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
  // You can replace this with your actual data
  const updates = [
    {
      category: 'Änderungen',
      subcategories: [
        {
          subcategory: 'Jahresplanung',
          items: [
            { text: 'Bugfix: Fixed authentication timeout issues.', type: 'fixed' },
            { text: 'New: Added debounce to auth checks for better performance.', type: 'warning' },
          ],
        },
        {
          subcategory: 'Allerleilektion',
          items: [
            { text: 'Improvement: Enhanced UI responsiveness on mobile devices.', type: 'not-fixed' },
            { text: 'Another item here.', type: 'fixed' },
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
          <DialogTitle>TeacherOrg Update: Version {version}</DialogTitle>
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