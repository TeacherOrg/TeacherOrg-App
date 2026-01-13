import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Setting, Class, Subject, Holiday, YearlyLesson, Lesson, Student, Topic, Performance, UeberfachlichKompetenz, AllerleiLesson, Competency, Chore, ChoreAssignment, Group, UserPreferences, Fachbereich } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, User as UserIcon, Sun, Moon, Monitor, Home, RotateCcw, Lock, LogOut, HelpCircle, CheckCircle, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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

  // Account löschen State
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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

  // Account komplett löschen
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'LÖSCHEN') {
      toast.error('Bitte geben Sie "LÖSCHEN" ein, um fortzufahren.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      const userId = pb.authStore.model.id;

      // Helper für Rate-Limiting
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      // 1. Alle Klassen des Users laden
      const userClasses = await Class.filter({ user_id: userId });
      const classIds = userClasses.map(c => c.id);

      // 2. Alle abhängigen Daten laden
      const [
        allSubjects,
        allStudents,
        allLessons,
        allYearlyLessons,
        allTopics,
        allPerformances,
        allUeberfachlich,
        allSettings,
        allHolidays
      ] = await Promise.all([
        Subject.list().catch(() => []),
        Student.list().catch(() => []),
        Lesson.list({ user_id: userId }).catch(() => []),
        YearlyLesson.list({ user_id: userId }).catch(() => []),
        Topic.list().catch(() => []),
        Performance.list().catch(() => []),
        UeberfachlichKompetenz.list().catch(() => []),
        Setting.filter({ user_id: userId }).catch(() => []),
        Holiday.filter({ user_id: userId }).catch(() => [])
      ]);

      // Filter nach User-Klassen
      const userSubjects = allSubjects.filter(s => classIds.includes(s.class_id));
      const userStudents = allStudents.filter(s => classIds.includes(s.class_id));
      const userTopics = allTopics.filter(t => classIds.includes(t.class_id));
      const subjectIds = userSubjects.map(s => s.id);
      const studentIds = userStudents.map(s => s.id);
      const userPerformances = allPerformances.filter(p => studentIds.includes(p.student_id) || classIds.includes(p.class_id));
      const userUeberfachlich = allUeberfachlich.filter(u => studentIds.includes(u.student_id) || classIds.includes(u.class_id));

      // Zusätzliche Entities mit try/catch
      let allerleiLessons = [], competencies = [], chores = [], choreAssignments = [], groups = [], groupSets = [], userPrefs = [], fachbereiche = [];

      try { allerleiLessons = await AllerleiLesson.list({ user_id: userId }); } catch(e) {}
      try { competencies = await Competency.list(); competencies = competencies.filter(c => classIds.includes(c.class_id)); } catch(e) {}
      try { chores = await Chore.list(); chores = chores.filter(c => classIds.includes(c.class_id)); } catch(e) {}
      try { choreAssignments = await ChoreAssignment.list(); choreAssignments = choreAssignments.filter(c => classIds.includes(c.class_id)); } catch(e) {}
      try { groups = await Group.list(); groups = groups.filter(g => classIds.includes(g.class_id)); } catch(e) {}
      try { groupSets = await pb.collection('group_sets').getFullList(); groupSets = groupSets.filter(g => classIds.includes(g.class_id)); } catch(e) {}
      try { userPrefs = await UserPreferences.list(); userPrefs = userPrefs.filter(p => classIds.includes(p.class_id)); } catch(e) {}
      try {
        for (const subjectId of subjectIds) {
          const fb = await Fachbereich.list({ subject_id: subjectId });
          fachbereiche.push(...fb);
        }
      } catch(e) {}

      console.log('Deleting account data:', {
        classes: userClasses.length,
        subjects: userSubjects.length,
        students: userStudents.length,
        lessons: allLessons.length,
        yearlyLessons: allYearlyLessons.length,
        topics: userTopics.length,
        performances: userPerformances.length,
        settings: allSettings.length,
        holidays: allHolidays.length
      });

      // 3. Löschen in korrekter Reihenfolge (wegen Relations)

      // Performances
      for (const p of userPerformances) {
        try { await Performance.delete(p.id); await delay(30); } catch(e) { console.warn('Error deleting performance:', e); }
      }

      // UeberfachlichKompetenzen
      for (const u of userUeberfachlich) {
        try { await UeberfachlichKompetenz.delete(u.id); await delay(30); } catch(e) { console.warn('Error deleting ueberfachlich:', e); }
      }

      // ChoreAssignments
      for (const ca of choreAssignments) {
        try { await ChoreAssignment.delete(ca.id); await delay(30); } catch(e) {}
      }

      // Chores
      for (const c of chores) {
        try { await Chore.delete(c.id); await delay(30); } catch(e) {}
      }

      // Competencies
      for (const c of competencies) {
        try { await Competency.delete(c.id); await delay(30); } catch(e) {}
      }

      // GroupSets
      for (const gs of groupSets) {
        try { await pb.collection('group_sets').delete(gs.id); await delay(30); } catch(e) {}
      }

      // Groups
      for (const g of groups) {
        try { await Group.delete(g.id); await delay(30); } catch(e) {}
      }

      // UserPreferences
      for (const up of userPrefs) {
        try { await UserPreferences.delete(up.id); await delay(30); } catch(e) {}
      }

      // AllerleiLessons
      for (const al of allerleiLessons) {
        try { await AllerleiLesson.delete(al.id); await delay(30); } catch(e) {}
      }

      // YearlyLessons
      for (const yl of allYearlyLessons) {
        try { await YearlyLesson.delete(yl.id); await delay(30); } catch(e) { console.warn('Error deleting yearly lesson:', e); }
      }

      // Lessons
      for (const l of allLessons) {
        try { await Lesson.delete(l.id); await delay(30); } catch(e) { console.warn('Error deleting lesson:', e); }
      }

      // Topics
      for (const t of userTopics) {
        try { await Topic.delete(t.id); await delay(30); } catch(e) { console.warn('Error deleting topic:', e); }
      }

      // Fachbereiche
      for (const fb of fachbereiche) {
        try { await Fachbereich.delete(fb.id); await delay(30); } catch(e) {}
      }

      // Subjects
      for (const s of userSubjects) {
        try { await Subject.delete(s.id); await delay(30); } catch(e) { console.warn('Error deleting subject:', e); }
      }

      // Students
      for (const s of userStudents) {
        try { await Student.delete(s.id); await delay(30); } catch(e) { console.warn('Error deleting student:', e); }
      }

      // Classes
      for (const c of userClasses) {
        try { await Class.delete(c.id); await delay(30); } catch(e) { console.warn('Error deleting class:', e); }
      }

      // Settings
      for (const s of allSettings) {
        try { await Setting.delete(s.id); await delay(30); } catch(e) { console.warn('Error deleting setting:', e); }
      }

      // Holidays
      for (const h of allHolidays) {
        try { await Holiday.delete(h.id); await delay(30); } catch(e) { console.warn('Error deleting holiday:', e); }
      }

      // 4. User selbst löschen
      await pb.collection('users').delete(userId);

      // 5. Aufräumen und weiterleiten
      toast.success('Account wurde gelöscht.');
      pb.authStore.clear();
      window.dispatchEvent(new CustomEvent('user-logout'));
      window.location.href = '/login';

    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(`Fehler beim Löschen des Accounts: ${error.message}`);
      setIsDeletingAccount(false);
    }
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
        <CardContent className="space-y-4">
          <div>
            <Button variant="destructive" onClick={handleLogout}>
              Ausloggen
            </Button>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Sie werden zur Login-Seite umgeleitet.</p>
          </div>

          <Separator className="bg-slate-200 dark:bg-slate-700" />

          <div>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-700 hover:bg-red-800"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Account löschen
              </Button>
            ) : (
              <div className="space-y-3 p-4 border border-red-500 rounded-lg bg-red-50 dark:bg-red-950/30">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">Achtung: Diese Aktion kann nicht rückgängig gemacht werden!</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Alle Ihre Daten werden unwiderruflich gelöscht: Klassen, Fächer, Schüler, Lektionen, Themen, Leistungsdaten und Einstellungen.
                </p>
                <div>
                  <Label className="text-sm text-red-700 dark:text-red-400">
                    Geben Sie <strong>LÖSCHEN</strong> ein, um zu bestätigen:
                  </Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="LÖSCHEN"
                    className="mt-1 border-red-300 dark:border-red-700 bg-white dark:bg-slate-800"
                    disabled={isDeletingAccount}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount || deleteConfirmText !== 'LÖSCHEN'}
                    className="bg-red-700 hover:bg-red-800"
                  >
                    {isDeletingAccount ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Lösche Account...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Endgültig löschen
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={isDeletingAccount}
                    className="border-slate-300 dark:border-slate-600"
                  >
                    Abbrechen
                  </Button>
                </div>
              </div>
            )}
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              ⚠️ Dies löscht unwiderruflich alle Ihre Daten!
            </p>
          </div>
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

  // ESC key handler
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

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
      case 'Hilfe': return { onClose };
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
          <aside className="w-1/4 bg-slate-50 dark:bg-slate-800 p-4 border-r border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <nav className="space-y-2 overflow-y-auto flex-1 pr-2">
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
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600"
          >
            Abbrechen
          </Button>
          {hasPendingChanges() ? (
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Speichern & Schließen
            </Button>
          ) : (
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
              Schließen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;