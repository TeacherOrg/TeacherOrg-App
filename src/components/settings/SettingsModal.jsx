import React, { useState, useEffect, useCallback } from 'react';
import { Setting, Class, Subject, Holiday } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, User as UserIcon, Sun, Moon, Monitor, Home, RotateCcw, Mail, Lock, LogOut } from 'lucide-react';
import pb from '@/api/pb';
import CalendarLoader from '../ui/CalendarLoader';

import ClassesSettings from './ClassesSettings';
import SubjectSettings from './SubjectSettings';
import ScheduleSettings from './ScheduleSettings';
import HolidaySettings from './HolidaySettings';
import SizeSettings from './SizeSettings';
import HelpSettings from './HelpSettings';

const ProfileSettings = ({
  pendingEmail, setPendingEmail,
  pendingUserSettings, setPendingUserSettings
}) => {
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

  const handleRestartOnboarding = () => {
    if (window.confirm('Möchten Sie das Einführungstutorial wirklich neu starten?')) {
      setPendingUserSettings(prev => ({ ...prev, has_completed_onboarding: false }));
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
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
    { value: 'Grades', label: 'Noten' },
    { value: 'Groups', label: 'Gruppen' },
    { value: 'Chores', label: 'Ämtchen' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-blue-600" />
            Account-Daten
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="email">E-Mail-Adresse</Label>
          <Input id="email" type="email" value={pendingEmail} onChange={(e) => setPendingEmail(e.target.value)} />
          <p className="text-sm text-slate-600 dark:text-slate-400">Änderung erfordert E-Mail-Bestätigung.</p>
          {emailMessage && <p className="text-sm text-green-600 dark:text-green-400">{emailMessage}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-red-600" />
            Passwort ändern
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showPasswordForm ? (
            <Button onClick={() => setShowPasswordForm(true)}>Passwort ändern</Button>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="old-password">Altes Passwort</Label>
              <Input id="old-password" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              <Label htmlFor="new-password">Neues Passwort</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <Label htmlFor="confirm-password">Bestätigen</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <Button onClick={handlePasswordChange} className="bg-green-600 text-white hover:bg-green-700">Bestätigen</Button>
              <Button onClick={() => setShowPasswordForm(false)} variant="outline" className="ml-2">Abbrechen</Button>
              {passwordMessage && <p className="text-sm text-green-600 dark:text-green-400">{passwordMessage}</p>}
            </div>
          )}
          <Button variant="link" onClick={handleForgotPassword} className="mt-2 text-blue-600">Passwort vergessen?</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
            <UserIcon className="w-5 h-5" />
            Benutzerinformationen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{user?.email || 'Unbekannt'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Sun className="w-5 h-5 text-yellow-500" />
            Darstellung
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Design</Label>
          <Select value={pendingUserSettings.preferred_theme} onValueChange={handleThemeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <opt.icon className="w-4 h-4 mr-2" /> {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Home className="w-5 h-5 text-blue-500" />
            Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label>Startseite</Label>
          <Select value={pendingUserSettings.default_start_page} onValueChange={handleStartPageChange}>
            <SelectTrigger>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-green-500" />
            Tutorial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRestartOnboarding} variant="outline">
            <RotateCcw className="mr-2" /> Neu starten
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
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
  const [pendingUserSettings, setPendingUserSettings] = useState({ preferred_theme: 'dark', default_start_page: 'Timetable' });
  const [initialSettings, setInitialSettings] = useState(null);

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
        setInitialSettings(latestSettings);
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
            fixedScheduleTemplate: {}
        };
        try {
            const newSettings = await Setting.create(defaultSettings);
            setSettings(newSettings);
            setInitialSettings(newSettings);
        } catch (error) {
            if (error.status === 409) {
            const existingSettings = await Setting.findOne({ user_id: userId });
            if (existingSettings) {
                setSettings(existingSettings);
                setInitialSettings(existingSettings);
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
    }
  }, [isOpen, loadAllData]);

  const handleSave = async () => {
    try {
      if (settings && settings.id) {
        // Erweitere mit autoFit (falls in SizeSettings geändert)
        await Setting.update(settings.id, {
          ...settings,
          autoFit: settings.autoFit ?? true, // Speichere autoFit persistent
        });
      }

      if (activeCategory === 'Profil') {
        if (pendingEmail && pendingEmail !== user?.email) {
          await pb.collection('users').requestEmailChange(pendingEmail);
        }
        await pb.collection('users').update(user.id, pendingUserSettings);
      }

      console.log("Settings saved!");
      window.dispatchEvent(new CustomEvent('settings-changed'));
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
        pendingUserSettings, setPendingUserSettings,
        onClose
      };
      default: return {};
    }
  };

  const hasPendingChanges = () => {
    return pendingEmail !== user?.email || JSON.stringify(pendingUserSettings) !== JSON.stringify({ preferred_theme: user?.preferred_theme, default_start_page: user?.default_start_page }) || JSON.stringify(settings) !== JSON.stringify(initialSettings);
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