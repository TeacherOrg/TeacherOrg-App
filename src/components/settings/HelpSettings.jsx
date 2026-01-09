import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, ChevronDown, ChevronRight, Settings, Calendar, GraduationCap, BookOpen, LayoutDashboard, ClipboardList, Globe, Keyboard, Play, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { useTour } from '@/components/onboarding/TourProvider';
import { toast } from 'sonner';

const guides = [
    {
        id: 'setup',
        title: 'Erste Schritte & Einrichtung',
        icon: Settings,
        items: [
            {
                title: 'Klassen anlegen',
                content: 'Gehen Sie zu "Einstellungen > Klassen", um Ihre Klassen zu definieren. Dies ist der erste Schritt, da Fächer und Schüler einer Klasse zugeordnet werden.'
            },
            {
                title: 'Fächer definieren',
                content: 'Unter "Einstellungen > Fächer" können Sie für jede Klasse die Fächer mit Farben und Wochenstunden festlegen. Diese Farben werden im gesamten Planer verwendet.'
            },
            {
                title: 'Stundenraster anpassen',
                content: 'Passen Sie im Reiter "Stundenplan" die Startzeiten, Lektionsdauer und Pausen an Ihren Schulalltag an.'
            },
            {
                title: 'Flexibel vs. Fixiert',
                content: 'Wählen Sie "Fixiert" für einen klassischen, wöchentlich gleichen Stundenplan. Nutzen Sie "Flexibel", wenn sich Ihr Plan jede Woche ändert oder Sie viel Projektunterricht machen. Diese Einstellung ist grundlegend für die Planung.'
            }
        ]
    },
    {
        id: 'shortcuts',
        title: 'Shortcuts – Schneller planen',
        icon: Keyboard,
        items: [
            {
                title: 'Grundlegende Aktionen',
                content: (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span>Rechtsklick auf Lektion</span>
                            <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">Kontextmenü</kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Lektion löschen</span>
                            <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">Entf / ⌫</kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Alle Modals schließen</span>
                            <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">Esc</kbd>
                        </div>
                    </div>
                )
            },
            {
                title: 'Verschieben & Kopieren',
                content: (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span>Lektion verschieben</span>
                            <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">Ziehen</kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Lektion kopieren</span>
                            <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">Alt + Ziehen</kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Verschieben nach… öffnen</span>
                            <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">⌘/Strg + X</kbd>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Kopieren nach… öffnen</span>
                            <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">⌘/Strg + C</kbd>
                        </div>
                    </div>
                )
            },
            {
                title: 'Schnell duplizieren',
                content: (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span>In nächste freie Stunde</span>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">⌘/Strg + D</kbd>
                                <kbd className="px-2 py-1 text-xs bg-emerald-600 text-white rounded">↑</kbd>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>In vorherige freie Stunde</span>
                            <div className="flex items-center gap-2">
                                <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded">⌘/Strg + ↓</kbd>
                                <kbd className="px-2 py-1 text-xs bg-emerald-600 text-white rounded">↓</kbd>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                title: 'Tipp für Power-User',
                content: (
                    <p className="text-sm italic text-slate-500 dark:text-slate-400">
                        Halten Sie beim Ziehen <kbd className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded mx-1">Alt</kbd> gedrückt, um eine Kopie zu erstellen – inklusive aller Schritte, Notizen und Materialien!
                    </p>
                )
            }
        ]
    },
    {
        id: 'planning',
        title: 'Stundenplan & Planung',
        icon: Calendar,
        items: [
            {
                title: 'Lektionen erstellen',
                content: 'Klicken Sie im Stundenplan auf ein freies Feld (+), um eine Lektion zu erstellen. Sie können auch Lektionen per Drag & Drop verschieben.'
            },
            {
                title: 'Jahresplanung',
                content: 'In der Jahresansicht (Navigationsleiste links "Jahresplan") können Sie Themen erstellen und diese über die Wochen verteilen. Tippen Sie auf eine Zelle im Jahresraster, um Themen zuzuweisen.'
            },
            {
                title: 'Ferien eintragen',
                content: 'Tragen Sie Ferien und Feiertage unter "Einstellungen > Ferien" ein. Diese werden im Kalender visuell hervorgehoben und blockieren die Planung.'
            }
        ]
    },
    {
        id: 'teaching',
        title: 'Unterricht & Durchführung',
        icon: LayoutDashboard,
        items: [
            {
                title: 'Tagesansicht nutzen',
                content: 'Die Tagesansicht (Landing Page) zeigt Ihnen den aktuellen Tag im Detail. Sie sehen Lektionsschritte, Pausenzeiten und können Notizen machen.'
            },
            {
                title: 'Lektionsschritte',
                content: 'Definieren Sie in den Lektionsdetails (Klick auf eine Lektion) genaue Abläufe, Zeitpläne und Materialien für jede Stunde.'
            },
            {
                title: 'Allerlei-Lektionen',
                content: 'Nutzen Sie "Allerlei-Lektionen" für fächerübergreifenden Unterricht oder freie Arbeitsphasen. Sie können diese Option beim Erstellen oder Bearbeiten einer Lektion aktivieren, um mehrere Themenbereiche abzudecken.'
            }
        ]
    },
    {
        id: 'students',
        title: 'Schüler & Leistungen',
        icon: GraduationCap,
        items: [
            {
                title: 'Schüler verwalten',
                content: 'Unter "Schüler" können Sie Ihre Klassenlisten pflegen. Sie können Schüler einzeln anlegen oder importieren.'
            },
            {
                title: 'Noten & Kompetenzen',
                content: 'Im Bereich "Noten" erfassen Sie Leistungen. Sie können klassische Noten oder kompetenzorientierte Bewertungen (nach Lehrplan 21) eintragen.'
            },
            {
                title: 'Gruppen bilden',
                content: 'Nutzen Sie das "Gruppen"-Tool, um schnell zufällige oder gezielte Gruppen für den Unterricht zu erstellen.'
            }
        ]
    },
    {
        id: 'topics',
        title: 'Themenplanung',
        icon: BookOpen,
        items: []
    },
    {
        id: 'chores_groups',
        title: 'Ämtchen & Gruppen',
        icon: ClipboardList,
        items: []
    }
];

const GuideItem = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-3 px-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700/30 rounded-md transition-colors"
            >
                <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">{item.title}</span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="text-sm text-slate-600 dark:text-slate-400 px-2 pb-3 leading-relaxed">
                            {item.content}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function HelpSettings() {
    const navigate = useNavigate();
    const { startTour, completedTours } = useTour();

    const handleFeedback = () => {
        window.open('mailto:support@timegrid.app?subject=TimeGrid Feedback', '_blank');
    };

    const handleStartTour = () => {
        try {
            startTour('INTERACTIVE_ONBOARDING');
            toast.success('Tour gestartet!');
        } catch (error) {
            console.error('Error starting tour:', error);
            toast.error('Fehler beim Starten der Tour');
        }
    };

    const isTourCompleted = completedTours.includes('INTERACTIVE_ONBOARDING');

    return (
        <div className="space-y-6 pr-2">
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hilfe & Anleitungen</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Kurzanleitungen und Tipps für die Nutzung von TimeGrid.
                </p>
            </div>

            {/* Interactive Tour Section */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                        <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Interaktive Tour
                    </CardTitle>
                    <CardDescription className="text-slate-700 dark:text-slate-300">
                        Lernen Sie die wichtigsten Funktionen von TeacherOrg kennen, indem Sie durch eine geführte Tour geführt werden.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleStartTour}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <Play className="w-4 h-4 mr-2" />
                        {isTourCompleted ? 'Tour wiederholen' : 'Tour starten'}
                    </Button>
                    {isTourCompleted && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-green-600 dark:text-green-400">
                            <Check className="w-4 h-4" />
                            <span>Tour abgeschlossen</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                {guides.map((guide) => (
                    <Card key={guide.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-hidden">
                        <CardHeader className="pb-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50">
                            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2 text-base">
                                <guide.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                {guide.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-2">
                            <div className="flex flex-col">
                                {guide.items.map((item, index) => (
                                    <GuideItem key={index} item={item} />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mt-6">
                <CardHeader>
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        Noch Fragen?
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                        Wir sind für Sie da, wenn Sie weitere Unterstützung benötigen.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        <Button
                            onClick={handleFeedback}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Support kontaktieren
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate(createPageUrl('Landing'))}
                            className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <Globe className="w-4 h-4 mr-2" />
                            Landing Page
                        </Button>
                    </div>
                    <div className="text-center pt-2">
                         <p className="text-xs text-slate-500">TimeGrid v1.0 • Entwickelt mit ❤️ für Lehrpersonen</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}