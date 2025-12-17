// src/components/settings/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/api/pb'; // PocketBase-Client
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserIcon, Sun, Moon, Monitor, Home, RotateCcw, Mail, Lock, Eye } from 'lucide-react';

export default function ProfileSettings({ onClose }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [userSettings, setUserSettings] = useState({
        preferred_theme: 'dark',
        default_start_page: 'Timetable'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [newEmail, setNewEmail] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState('');

    useEffect(() => {
        const loadUserData = async () => {
            try {
                const fetchedUser = pb.authStore.model;
                if (fetchedUser) {
                    setUser(fetchedUser);
                    setUserSettings({
                        preferred_theme: fetchedUser.preferred_theme || 'dark',
                        default_start_page: fetchedUser.default_start_page || 'Timetable'
                    });
                    setNewEmail(fetchedUser.email || '');
                }
            } catch (error) {
                console.error("Failed to load user data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadUserData();
    }, []);

    const handleSettingChange = async (setting, value) => {
        try {
            const updatedSettings = { ...userSettings, [setting]: value };
            setUserSettings(updatedSettings);
            
            const { error } = await pb.collection('users').update(user.id, updatedSettings);
            if (error) throw error;
            
            // Apply theme immediately
            if (setting === 'preferred_theme') {
                applyTheme(value);
            }
            
        } catch (error) {
            console.error(`Failed to update ${setting}:`, error);
        }
    };

    const applyTheme = (theme) => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else { // system
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (systemPrefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
        localStorage.setItem('theme', theme);
    };

    const handleEmailChange = async () => {
        if (!newEmail) return;
        try {
            await pb.collection('users').requestEmailChange(newEmail);
            setEmailMessage('E-Mail-Änderung angefordert. Bitte bestätigen Sie die Änderung in Ihrer neuen E-Mail-Adresse.');
        } catch (error) {
            setEmailMessage(`Fehler: ${error.message}`);
        }
    };

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            setPasswordMessage('Passwörter stimmen nicht überein.');
            return;
        }
        if (!newPassword) return;
        try {
            await pb.collection('users').update(user.id, { password: newPassword });
            setPasswordMessage('Passwort geändert. Eine Bestätigungs-E-Mail wurde gesendet.');
            setShowPasswordForm(false);
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setPasswordMessage(`Fehler: ${error.message}`);
        }
    };

    const handleRestartOnboarding = async () => {
        if (window.confirm("Möchten Sie das Einführungstutorial wirklich neu starten? Dies wird Sie durch die Grundfunktionen der App führen.")) {
            try {
                await pb.collection('users').update(user.id, { has_completed_onboarding: false });
                window.location.reload(); // Reload to trigger onboarding
            } catch (error) {
                console.error("Failed to reset onboarding:", error);
            }
        }
    };

    const getInitials = (name) => {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    };

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

    if (isLoading) {
        return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Mein Profil</h2>
                <p className="text-slate-600 dark:text-slate-400">Verwalten Sie Ihre persönlichen Einstellungen</p>
            </div>

            {/* Account Data Card */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Account-Daten
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">E-Mail-Adresse</Label>
                        <Input
                            id="email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white"
                        />
                        <Button 
                            onClick={handleEmailChange}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                            E-Mail ändern
                        </Button>
                        {emailMessage && <p className="text-sm text-green-600 dark:text-green-400">{emailMessage}</p>}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Änderungen an der E-Mail erfordern eine Bestätigung per E-Mail.
                    </p>
                </CardContent>
            </Card>

            {/* Password Change Card */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                        <Lock className="w-5 h-5 text-red-600" />
                        Passwort ändern
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!showPasswordForm ? (
                        <Button 
                            onClick={() => setShowPasswordForm(true)}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Passwort ändern
                        </Button>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300">Neues Passwort</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white"
                            />
                            <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300">Passwort bestätigen</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white"
                            />
                            <Button 
                                onClick={handlePasswordChange}
                                className="bg-green-600 text-white hover:bg-green-700"
                            >
                                Bestätigen und ändern
                            </Button>
                            <Button 
                                onClick={() => setShowPasswordForm(false)}
                                variant="outline"
                                className="ml-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            >
                                Abbrechen
                            </Button>
                            {passwordMessage && <p className="text-sm text-green-600 dark:text-green-400">{passwordMessage}</p>}
                        </div>
                    )}
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Nach der Änderung erhalten Sie eine Bestätigungs-E-Mail.
                    </p>
                </CardContent>
            </Card>

            {/* Profile Info Card (angepasst, ohne Google-Text) */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-white" />
                        </div>
                        Benutzerinformationen
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <Avatar className="h-12 w-12 bg-blue-600 text-white">
                            <AvatarFallback className="bg-blue-600 text-white font-semibold">
                                {getInitials(user?.full_name || user?.email)}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-white">{user?.full_name || 'Unbekannt'}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email || 'Keine E-Mail'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Landing Page Preview */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                        <Eye className="w-5 h-5 text-green-500" />
                        Landingpage anzeigen
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white">Vorschau der Landingpage</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Öffnen Sie die Landingpage temporär, um die App-Funktionen zu erkunden.
                            </p>
                        </div>
                        <Button 
                            onClick={() => { onClose(); navigate('/landing'); }}
                            className="bg-green-600 text-white hover:bg-green-700"
                        >
                            <Eye className="w-4 h-4 mr-2" />
                            Anzeigen
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                        <Sun className="w-5 h-5 text-yellow-500" />
                        Darstellung
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="theme-select" className="text-slate-700 dark:text-slate-300">Design</Label>
                        <Select
                            value={userSettings.preferred_theme}
                            onValueChange={(value) => handleSettingChange('preferred_theme', value)}
                        >
                            <SelectTrigger id="theme-select" className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {themeOptions.map(option => {
                                    const Icon = option.icon;
                                    return (
                                        <SelectItem key={option.value} value={option.value}>
                                            <div className="flex items-center gap-2">
                                                <Icon className="w-4 h-4" />
                                                {option.label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Wählen Sie Ihr bevorzugtes Farbschema
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Navigation Settings */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                        <Home className="w-5 h-5 text-blue-500" />
                        Navigation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="start-page-select" className="text-slate-700 dark:text-slate-300">Startseite</Label>
                        <Select
                            value={userSettings.default_start_page}
                            onValueChange={(value) => handleSettingChange('default_start_page', value)}
                        >
                            <SelectTrigger id="start-page-select" className="bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {pageOptions.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Diese Seite wird beim Öffnen der App angezeigt
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Tutorial Section */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3 text-slate-800 dark:text-white">
                        <RotateCcw className="w-5 h-5 text-green-500" />
                        Tutorial
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-slate-800 dark:text-white">Einführungstutorial</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Starten Sie das Tutorial neu, um die App-Funktionen zu erkunden
                            </p>
                        </div>
                        <Button 
                            onClick={handleRestartOnboarding}
                            variant="outline"
                            className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Neu starten
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}