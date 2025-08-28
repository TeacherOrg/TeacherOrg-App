import React, { useState, useEffect, useCallback } from 'react';
import { Setting, Class, Subject, Holiday } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, User as UserIcon, Sun, Moon, Monitor, Home, RotateCcw, Mail, Lock, LogOut } from 'lucide-react'; // Neu: LogOut-Icon
import { supabase } from '@/api/supabase'; // Korrigierter Import mit Alias
import CalendarLoader from '../ui/CalendarLoader';

// Import the other settings components
import ClassesSettings from './ClassesSettings';
import SubjectSettings from './SubjectSettings';
import ScheduleSettings from './ScheduleSettings';
import HolidaySettings from './HolidaySettings';
import SizeSettings from './SizeSettings';

// Angepasste ProfileSettings-Komponente (vor CATEGORIES deklariert)
const ProfileSettings = ({
    pendingEmail, setPendingEmail,
    pendingUserSettings, setPendingUserSettings // Passwort nicht pending, sofort speichern
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
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        loadUser();
    }, []);

    const handleThemeChange = (value) => {
        setPendingUserSettings(prev => ({ ...prev, preferred_theme: value }));
        // Apply theme locally (preview)
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

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            window.location.href = '/login'; // Redirect zur Login-Seite (passe an dein Routing an)
        } catch (error) {
            console.error('Logout failed:', error);
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
            // Re-Auth mit altem Passwort
            const { error: reAuthError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: oldPassword
            });
            if (reAuthError) throw new Error('Altes Passwort falsch.');

            // Neues Passwort setzen
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;

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
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: 'http://localhost:5173/auth/change-password' // Passe an deine ChangePassword-URL an
            });
            if (error) throw error;
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

            {/* Rest wie in deiner Version: Benutzerinfo, Darstellung, Navigation, Tutorial */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
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

            {/* Neu: Logout-Option am Ende */}
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
    { name: 'Profil', icon: '👤', component: ProfileSettings }, // Neue Kategorie
];

const SettingsModal = ({ isOpen, onClose }) => {
    const [activeCategory, setActiveCategory] = useState('Klassen');
    const [isLoading, setIsLoading] = useState(true);

    // All data states
    const [settings, setSettings] = useState(null);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [activeClassId, setActiveClassId] = useState(null);
    const [user, setUser] = useState(null); // Neu: State für user hinzugefügt
    
    // Für Profil-Änderungen (pending, um zentral zu speichern)
    const [pendingEmail, setPendingEmail] = useState('');
    const [pendingNewPassword, setPendingNewPassword] = useState('');
    const [pendingConfirmPassword, setPendingConfirmPassword] = useState('');
    const [pendingUserSettings, setPendingUserSettings] = useState({ preferred_theme: 'dark', default_start_page: 'Timetable' });

    const loadAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [settingsData, classData, subjectData, holidayData, { data: { user: fetchedUser } }] = await Promise.all([
                Setting.list(), Class.list(), Subject.list(), Holiday.list(), supabase.auth.getUser(),
            ]);

            if (settingsData.length > 0) {
                setSettings(settingsData[0]);
            } else {
                const defaultSettings = await Setting.create({});
                setSettings(defaultSettings);
            }
            
            setClasses(classData || []);
            setSubjects(subjectData || []);
            setHolidays(holidayData || []);

            if (classData?.length > 0 && !activeClassId) {
              setActiveClassId(classData[0].id);
            }

            // Lade User-Daten für Profil
            if (fetchedUser) {
                setUser(fetchedUser); // Neu: Setze user-State
                setPendingEmail(fetchedUser.email || '');
                setPendingUserSettings({
                    preferred_theme: fetchedUser.user_metadata?.preferred_theme || 'dark',
                    default_start_page: fetchedUser.user_metadata?.default_start_page || 'Timetable'
                });
            }

        } catch (error) {
            console.error("Failed to load settings data:", error);
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
                await Setting.update(settings.id, settings);
            }

            // Speichere Profil-Änderungen, wenn pending (Passwort wird separat gehandhabt)
            if (activeCategory === 'Profil') {
                if (pendingEmail && pendingEmail !== user?.email) {
                    await supabase.auth.updateUser({ email: pendingEmail });
                }
                await supabase.auth.updateUser({
                    data: pendingUserSettings
                });
            }

            console.log("Settings saved!");
            window.dispatchEvent(new CustomEvent('settings-changed'));
            onClose();
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
    };

    if (!isOpen) return null;

    const ActiveComponent = CATEGORIES.find(c => c.name === activeCategory)?.component;

    const getComponentProps = () => {
        switch (activeCategory) {
            case 'Klassen': return { classes, refreshData: loadAllData, setActiveClassId };
            case 'Fächer': return { subjects, classes, activeClassId, setActiveClassId, refreshData: loadAllData };
            case 'Stundenplan': return { settings, setSettings };
            case 'Ferien': return { holidays, refreshData: loadAllData };
            case 'Größe': return { settings, setSettings };
            case 'Profil': return { 
                pendingEmail, setPendingEmail,
                pendingNewPassword, setPendingNewPassword,
                pendingConfirmPassword, setPendingConfirmPassword,
                pendingUserSettings, setPendingUserSettings 
            }; // Props für pending Änderungen
            default: return {};
        }
    };

    const hasPendingChanges = () => {
        // Einfache Check, ob Änderungen pending sind (für Disable Save-Button)
        return pendingEmail !== user?.email || pendingNewPassword || Object.keys(pendingUserSettings).length > 0;
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
                        ) : ActiveComponent ? (
                            <ActiveComponent {...getComponentProps()} />
                        ) : (
                           <div className="text-slate-800 dark:text-white">Kategorie nicht gefunden</div>
                        )}
                    </main>
                </div>
                <div className="p-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                    <Button variant="outline" onClick={onClose}>Abbrechen</Button>
                    <Button onClick={handleSave} disabled={!hasPendingChanges() && activeCategory === 'Profil'} className="bg-blue-600 hover:bg-blue-700">Speichern & Schließen</Button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;