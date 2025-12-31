import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Setting, Class, Subject, Holiday, YearlyLesson, Lesson } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, User as UserIcon, Sun, Moon, Monitor, Home, RotateCcw, Lock, LogOut, HelpCircle, CheckCircle } from 'lucide-react';
import pb from '@/api/pb';
import CalendarLoader from '../ui/CalendarLoader';
import { generateLessonsFromFixedTemplate } from '@/utils/fixedScheduleGenerator';
import { syncYearlyLessonToWeekly } from '@/hooks/useYearlyLessonSync';
import { isEqual } from 'lodash';
import toast from 'react-hot-toast';
import { useTutorial, TUTORIAL_IDS } from '@/hooks/useTutorial';

import ClassesSettings from './ClassesSettings';
import SubjectSettings from './SubjectSettings';
import ScheduleSettings from './ScheduleSettings';
import HolidaySettings from './HolidaySettings';
import SizeSettings from './SizeSettings';
import HelpSettings from './HelpSettings';

const ProfileSettings = ({
  pendingEmail, setPendingEmail,
  pendingName, setPendingName,
  pendingUserSettings, setPendingUserSettings,
  onClose
}) => {
  const { resetAllTutorials, showTutorial, isCompleted, progress, setShowSetupWizard } = useTutorial();
  const [user, setUser] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = pb.authStore.model;
      if (currentUser) {
        setUser(currentUser);
      }
    };
    loadUser();
  }, []);

  const handleThemeChange = (value) => {
    setPendingUserSettings(prev => ({ ...prev, preferred_theme: value }));
    const root = window.document.documentElement;
    if (value === 'dark') root.classList.add('dark');
    else if (value === 'light') root.classList.remove('dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  };

  const handleStartPageChange = (value) => {
    setPendingUserSettings(prev => ({ ...prev, default_start_page: value }));
  };

  const handleRestartOnboarding = async () => {
    if (window.confirm('Möchten Sie alle Tutorials zurücksetzen und den Setup-Wizard erneut starten?')) {
      await resetAllTutorials();
      toast.success('Tutorials zurückgesetzt! Setup-Wizard wird beim nächsten Seitenaufruf angezeigt.');
    }
  };

  // Tutorial Namen für Anzeige
  const TUTORIAL_NAMES = {
    [TUTORIAL_IDS.SETUP]: 'Einrichtungs-Wizard',
    [TUTORIAL_IDS.TIMETABLE]: 'Stundenplan',
    [TUTORIAL_IDS.YEARLY]: 'Jahresansicht',
    [TUTORIAL_IDS.GROUPS]: 'Gruppen',
    [TUTORIAL_IDS.TOPICS]: 'Themen',
    [TUTORIAL_IDS.GRADES]: 'Leistung',
  };

  // Handler für Tutorial-Start mit Bestätigung
  const handleTutorialClick = (tutorialId, tutorialName) => {
    if (window.confirm(`${tutorialName} Tutorial starten?`)) {
      onClose(); // Settings-Modal schliessen
      setTimeout(() => showTutorial(tutorialId), 150); // Tutorial starten nach Modal-Animation
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    // Custom Event für App.jsx auslösen, um Cache und Store zu leeren
    window.dispatchEvent(new CustomEvent('user-logout'));
    window.location.href = '/login';
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwörter stimmen nicht überein.');
      return;
    }
    if (!oldPassword || !newPassword) {
      setPasswordMessage('Alle Felder ausfüllen.');
      return;
    }

    try {
      await pb.collection('users').authWithPassword(user.email, oldPassword);
      await pb.collection('users').update(user.id, { password: newPassword });
      setPasswordMessage('Passwort geändert! Bestätigung per E-Mail gesendet.');
      setShowPasswordForm(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordMessage(`Fehler: ${error.message}`);
    }
  };

  const handleForgotPassword = async () => {
    try {
      await pb.collection('users').requestPasswordReset(user.email);
      setPasswordMessage('Reset-Link gesendet! Überprüfe deine E-Mail.');
    } catch (error) {
      setPasswordMessage(`Fehler: ${error.message}`);
    }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

  const themeOptions = [
    { value: 'light', label: 'Hell', icon: Sun },
    { value: 'dark', label: 'Dunkel', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  const pageOptions = [
    { value: 'Timetable', label: 'Stundenplan' },
    { value: 'Grades', label: 'Leistungen' },
    { value: 'Groups', label: 'Gruppen' },
    { value: 'Chores', label: 'Ämtchen' }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
            <UserIcon className="w-5 h-5 text-blue-600" />
            Konto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-blue-600 text-white text-lg">{getInitials(pendingName || pendingEmail)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">Benutzername</Label>
                <Input
                  id="username"
                  type="text"
                  value={pendingName}
                  onChange={(e) => setPendingName(e.target.value)}
                  placeholder="Ihr Benutzername"
                  className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">E-Mail-Adresse</Label>
                <Input
                  id="email"
                  type="email"
                  value={pendingEmail}
                  onChange={(e) => setPendingEmail(e.target.value)}
                  className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">Änderung erfordert E-Mail-Bestätigung</p>
              </div>
              {emailMessage && <p className="text-sm text-green-600 dark:text-green-400">{emailMessage}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
            <Lock className="w-5 h-5 text-red-600" />
            Passwort ändern
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <Button onClick={() => setShowPasswordForm(true)}>Passwort ändern</Button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="old-password" className="text-slate-700 dark:text-slate-300">Altes Passwort</Label>
              <Input id="old-password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600" />
              <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300">Neues Passwort</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600" />
              <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300">Bestätigen</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600" />
              <Button onClick={handlePasswordChange} className="bg-green-600 text-white hover:bg-green-700">Bestätigen</Button>
              <Button onClick={() => setShowPasswordForm(false)} variant="outline" className="ml-2 border-slate-300 dark:border-slate-600">Abbrechen</Button>
              {passwordMessage && <p className="text-sm text-green-600 dark:text-green-400">{passwordMessage}</p>}
            </div>
          )}
          <Button variant="link" onClick={handleForgotPassword} className="mt-2 text-blue-600">Passwort vergessen?</Button>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
            <Sun className="w-5 h-5 text-yellow-500" />
            Darstellung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-slate-700 dark:text-slate-300">Design</Label>
          <Select value={pendingUserSettings.preferred_theme} onValueChange={handleThemeChange}>
            <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
            <Home className="w-5 h-5 text-blue-500" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-slate-700 dark:text-slate-300">Startseite</Label>
          <Select value={pendingUserSettings.default_start_page} onValueChange={handleStartPageChange}>
            <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
            <HelpCircle className="w-5 h-5 text-green-500" />
            Tutorials ({progress.completed}/{progress.total} abgeschlossen)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(TUTORIAL_NAMES).map(([id, name]) => (
              <Button
                key={id}
                onClick={() => handleTutorialClick(id, name)}
                variant="outline"
                size="sm"
                className="justify-start border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
              >
                {isCompleted(id) ? (
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                ) : (
                  <HelpCircle className="w-4 h-4 mr-2 text-slate-400" />
                )}
                {name}
              </Button>
            ))}
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <Button onClick={handleRestartOnboarding} variant="outline" size="sm" className="w-full border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
              <RotateCcw className="w-4 h-4 mr-2" /> Alle Tutorials zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-900 dark:text-white">
            <LogOut className="w-5 h-5 text-red-500" />
            Account-Aktionen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout}>
            Ausloggen
          </Button>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Sie werden zur Login-Seite umgeleitet.</p>
        </CardContent>
      </Card>
    </div>
  );
};

const CATEGORIES = [
  { name: 'Klassen', icon: '👥', component: ClassesSettings },
  { name: 'Fächer', icon: '📚', component: SubjectSettings },
  { name: 'Stundenplan', icon: '📅', component: ScheduleSettings },
  { name: 'Ferien', icon: '🏖️', component: HolidaySettings },
  { name: 'Größe', icon: '📏', component: SizeSettings },
  { name: 'Hilfe', icon: '❓', component: HelpSettings },
  { name: 'Profil', icon: '👤', component: ProfileSettings },
];

const SettingsModal = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('Hilfe');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [settings, setSettings] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [user, setUser] = useState(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [pendingUserSettings, setPendingUserSettings] = useState({ preferred_theme: 'dark', default_start_page: 'Timetable' });
  const initialSettingsRef = useRef(null);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
        if (!pb.authStore.isValid || !pb.authStore.model) {
        throw new Error('Nicht authentifiziert – bitte einloggen.');
        }
        if (pb.authStore.model.role !== 'teacher') {
        throw new Error('Unzureichende Rechte – nur für Teachers.');
        }
        const userId = pb.authStore.model.id;
        const [settingsData, classData, subjectData, holidayData] = await Promise.all([
        Setting.list({ user_id: userId }),
        Class.list({ user_id: userId }),
        Subject.list({ 'class_id.user_id': userId }),
        Holiday.list({ user_id: userId }),
        ]);

        const validClasses = classData.filter(cls => cls && cls.id && typeof cls.name === 'string');
        if (settingsData.length > 0) {
        const latestSettings = settingsData.sort((a, b) => new Date(b.updated) - new Date(a.updated))[0];
        setSettings(latestSettings);
        initialSettingsRef.current = latestSettings;
        } else {
        const defaultSettings = {
            user_id: userId,
            scheduleType: 'flexible',
            startTime: '08:00',
            lessonsPerDay: 8,
            lessonDuration: 45,
            shortBreak: 5,
            morningBreakAfter: 2,
            morningBreakDuration: 20,
            lunchBreakAfter: 4,
            lunchBreakDuration: 40,
            afternoonBreakAfter: 6,
            afternoonBreakDuration: 15,
            cellWidth: 120,
            cellHeight: 80,
            yearlyDensity: 'standard',
            fixedScheduleTemplate: {}
        };
        try {
            const newSettings = await Setting.create(defaultSettings);
            setSettings(newSettings);
            initialSettingsRef.current = newSettings;
        } catch (error) {
            if (error.status === 409) {
            const existingSettings = await Setting.findOne({ user_id: userId });
            if (existingSettings) {
                setSettings(existingSettings);
                initialSettingsRef.current = existingSettings;
            } else {
                throw new Error('Failed to fetch existing settings after 409 error');
            }
            } else {
            throw error;
            }
        }
        }

        setClasses(validClasses || []);
        setSubjects(subjectData || []);
        setHolidays(holidayData || []);

        if (validClasses.length > 0 && !activeClassId) {
        setActiveClassId(validClasses[0].id);
        }

        const fetchedUser = pb.authStore.model;
        if (fetchedUser) {
        setUser(fetchedUser);
        setPendingEmail(fetchedUser.email || '');
        setPendingName(fetchedUser.name || '');
        setPendingUserSettings({
            preferred_theme: fetchedUser.preferred_theme || 'dark',
            default_start_page: fetchedUser.default_start_page || 'Timetable'
        });
        } else {
        setErrorMessage('User-Daten konnten nicht geladen werden.');
        }
    } catch (error) {
        console.error("Failed to load settings data:", error);
        setErrorMessage(`Fehler beim Laden der Daten: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
    }, [activeClassId]);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    } else {
      // Reset states when modal closes
      setSettings(null);
      initialSettingsRef.current = null;
    }
  }, [isOpen, loadAllData]);

  const handleSave = async () => {
    try {
      // Check if switching to fixed mode or template changed
      const wasFixed = initialSettingsRef.current?.scheduleType === 'fixed';
      const isNowFixed = settings?.scheduleType === 'fixed';
      const templateChanged = !isEqual(
        initialSettingsRef.current?.fixedScheduleTemplate,
        settings?.fixedScheduleTemplate
      );

      // Save settings first
      let updatedSettings = settings;
      if (settings && settings.id) {
        const dataToSave = {
          ...settings,
          autoFit: settings.autoFit ?? true,
          yearlyDensity: settings.yearlyDensity ?? 'standard',
        };

        console.log('=== BEFORE SAVE ===');
        console.log('Full settings object:', JSON.stringify(settings, null, 2));
        console.log('Data being sent to Setting.update():', JSON.stringify(dataToSave, null, 2));
        console.log('scheduleType in settings:', settings.scheduleType);
        console.log('scheduleType in dataToSave:', dataToSave.scheduleType);

        updatedSettings = await Setting.update(settings.id, dataToSave);

        console.log('=== AFTER SAVE ===');
        console.log('Full response from DB:', JSON.stringify(updatedSettings, null, 2));
        console.log('scheduleType in updatedSettings:', updatedSettings.scheduleType);

        // Update local state with saved settings
        setSettings(updatedSettings);
        initialSettingsRef.current = updatedSettings;
      }

      // Trigger bulk lesson generation if needed
      if (isNowFixed && (!wasFixed || templateChanged)) {
        // Check if template has content
        const template = updatedSettings.fixedScheduleTemplate || {};
        const hasTemplateContent = Object.keys(template).some(day =>
          Array.isArray(template[day]) && template[day].length > 0
        );

        if (!hasTemplateContent) {
          console.log('Template ist leer - überspringe Generierung');
          // Don't show error, just skip generation - user can add lessons later
          setErrorMessage('');
          setIsLoading(false);
        } else {
          setIsLoading(true);
          setErrorMessage('Generiere Stunden aus Vorlage...');

          try {
            const userId = pb.authStore.model?.id;
            if (!userId) {
              throw new Error('Nicht authentifiziert');
            }

            // Fetch all necessary data
            const [allYearlyLessons, allLessons] = await Promise.all([
              YearlyLesson.list({ user_id: userId }),
              Lesson.list({ user_id: userId })
            ]);

            await generateLessonsFromFixedTemplate({
              template: updatedSettings.fixedScheduleTemplate,
              yearlyLessons: allYearlyLessons,
              existingLessons: allLessons,
              currentYear: new Date().getFullYear(),
              activeClassId: classes[0]?.id,
              userId: userId,
              settings: updatedSettings,
              subjects: subjects
            });

            // Synchronize all existing YearlyLessons to create missing weekly Lessons
            toast.loading('Synchronisiere bestehende Jahresplanung...', { id: 'sync-yearly' });

            try {
              let syncCount = 0;
              for (const yearlyLesson of allYearlyLessons) {
                try {
                  await syncYearlyLessonToWeekly(yearlyLesson, updatedSettings, subjects, allYearlyLessons);
                  syncCount++;

                  if (syncCount % 20 === 0) {
                    toast.loading(`Synchronisiert: ${syncCount}/${allYearlyLessons.length}...`, { id: 'sync-yearly' });
                  }
                } catch (syncError) {
                  console.warn('Error syncing yearly lesson:', yearlyLesson.id, syncError);
                }
              }

              toast.success(`${syncCount} Jahres-Lektionen synchronisiert!`, { id: 'sync-yearly', duration: 3000 });
            } catch (syncError) {
              console.error('Error during sync:', syncError);
              toast.error('Fehler bei der Synchronisierung', { id: 'sync-yearly' });
            }

            setErrorMessage('');
            setIsLoading(false);
          } catch (genError) {
            console.error('Error generating lessons:', genError);
            setErrorMessage(`Fehler beim Generieren: ${genError.message}`);
            setIsLoading(false);
            return; // Don't close modal
          }
        }
      }

      // User-Einstellungen immer speichern (nicht nur im Profil-Tab)
      if (pendingEmail && pendingEmail !== user?.email) {
        await pb.collection('users').requestEmailChange(pendingEmail);
      }
      await pb.collection('users').update(user.id, {
        ...pendingUserSettings,
        name: pendingName
      });

      console.log("Settings saved!");

      // Dispatch event with the updated settings
      window.dispatchEvent(new CustomEvent('settings-changed', {
        detail: { settings: updatedSettings || settings }
      }));

      // Small delay to ensure DB write completes before refetch
      await new Promise(resolve => setTimeout(resolve, 100));

      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
      setErrorMessage(`Fehler beim Speichern: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  const ActiveComponent = CATEGORIES.find(c => c.name === activeCategory)?.component;

  const getComponentProps = () => {
    switch (activeCategory) {
      case 'Klassen': return { classes, refreshData: loadAllData, setActiveClassId };
      case 'Fächer': return { subjects, classes, activeClassId, setActiveClassId, refreshData: loadAllData };
      case 'Stundenplan': return { settings, setSettings, classes, subjects };
      case 'Ferien': return { holidays, refreshData: loadAllData };
      case 'Größe': return { settings, setSettings };
      case 'Hilfe': return {};
      case 'Profil': return {
        pendingEmail, setPendingEmail,
        pendingName, setPendingName,
        pendingUserSettings, setPendingUserSettings,
        onClose
      };
      default: return {};
    }
  };

  const hasPendingChanges = () => {
    return pendingEmail !== user?.email ||
           pendingName !== (user?.name || '') ||
           JSON.stringify(pendingUserSettings) !== JSON.stringify({ preferred_theme: user?.preferred_theme, default_start_page: user?.default_start_page }) ||
           JSON.stringify(settings) !== JSON.stringify(initialSettingsRef.current);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] backdrop-blur-sm">
      <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-slate-300 dark:border-slate-700">
        <div className="p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Einstellungen</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-1/4 bg-slate-50 dark:bg-slate-800 p-4 border-r border-slate-200 dark:border-slate-700">
            <nav className="space-y-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(category.name)}
                  className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                    activeCategory === category.name
                    ? 'bg-blue-600 text-white font-semibold shadow'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              ))}
            </nav>
          </aside>
          <main className="w-3/4 overflow-y-auto p-6">
            {isLoading ? (
              <CalendarLoader />
            ) : errorMessage ? (
              <div className="text-red-500 font-semibold">{errorMessage}</div>
            ) : ActiveComponent ? (
              <ActiveComponent {...getComponentProps()} />
            ) : (
              <div className="text-slate-800 dark:text-white">Kategorie nicht gefunden</div>
            )}
          </main>
        </div>
        <div className="p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={!hasPendingChanges()} className="bg-blue-600 hover:bg-blue-700">Speichern & Schließen</Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;