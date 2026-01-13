import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Student, User, Performance, UeberfachlichKompetenz } from '@/api/entities';
import pb from '@/api/pb';
import toast from 'react-hot-toast';
import { useStudentSortPreference } from '@/hooks/useStudentSortPreference';
import { sortStudents } from '@/utils/studentSortUtils';
import CredentialsPrintModal from './CredentialsPrintModal';
import {
  Plus,
  Trash2,
  KeyRound,
  Printer,
  Upload,
  Loader2,
  Check,
  X,
  MailX,
  UserPlus,
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
  QrCode,
} from 'lucide-react';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const deleteWithRetry = async (deleteFunction, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await deleteFunction();
      return;
    } catch (error) {
      if (error.message?.includes('429') && attempt < maxRetries - 1) {
        await delay(2000 * (attempt + 1));
        continue;
      }
      if (error.message?.includes('404')) {
        return;
      }
      throw error;
    }
  }
};

export default function StudentManagementModal({
  isOpen,
  onClose,
  classData,
  onStudentsChange,
}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortPreference] = useStudentSortPreference();

  // Editing state
  const [editingStudent, setEditingStudent] = useState(null); // { id, field, value }

  // Import state
  const [showImportSection, setShowImportSection] = useState(false);
  const [importText, setImportText] = useState('');
  const [autoEmailEnabled, setAutoEmailEnabled] = useState(false);
  const [emailDomain, setEmailDomain] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Single student addition
  const [newStudent, setNewStudent] = useState({ first_name: '', last_name: '' });
  const [isAddingStudent, setIsAddingStudent] = useState(false);

  // Account creation state
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState([]);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  // Email generation for existing students
  const [showEmailGenerator, setShowEmailGenerator] = useState(false);
  const [generatorDomain, setGeneratorDomain] = useState('');
  const [isGeneratingEmails, setIsGeneratingEmails] = useState(false);

  // Sort students
  const sortedStudents = useMemo(
    () => sortStudents(students, sortPreference),
    [students, sortPreference]
  );

  // Load students when modal opens
  useEffect(() => {
    if (isOpen && classData?.id) {
      loadStudents();
    }
  }, [isOpen, classData?.id]);

  const loadStudents = async () => {
    if (!classData?.id) return;
    setLoading(true);
    try {
      const studentsData = await Student.filter({ class_id: classData.id });
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Fehler beim Laden der Schüler');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // === Single Student Addition ===
  const handleAddStudent = async () => {
    if (!classData?.id || !newStudent.first_name.trim() || !newStudent.last_name.trim()) return;

    setIsAddingStudent(true);
    try {
      const fullName = `${newStudent.first_name.trim()} ${newStudent.last_name.trim()}`;
      const currentUserId = pb.authStore.model.id;
      const generatedEmail = `${fullName.replace(/\s+/g, '.').toLowerCase()}@school.example.com`;

      const payload = {
        name: fullName,
        class_id: classData.id,
        user_id: currentUserId,
        email: generatedEmail,
        account_id: null,
      };

      await Student.create(payload);
      setNewStudent({ first_name: '', last_name: '' });
      await loadStudents();
      onStudentsChange?.();
      toast.success('Schüler hinzugefügt');
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Fehler beim Hinzufügen');
    } finally {
      setIsAddingStudent(false);
    }
  };

  // === Import with Auto-Email ===
  const handleImport = async () => {
    if (!classData?.id || !importText.trim()) return;

    setIsImporting(true);
    const lines = importText.split('\n').filter(line => line.trim());
    const currentUserId = pb.authStore.model.id;
    const importedStudents = [];
    const createdAccounts = [];

    try {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split(/[,\t\s]+/);
        let name = trimmed;

        if (parts.length >= 2) {
          name = `${parts[0]} ${parts.slice(1).join(' ')}`;
        }

        // Generate email if auto-email enabled
        let email = `${name.replace(/\s+/g, '.').toLowerCase()}@school.example.com`;

        if (autoEmailEnabled && emailDomain.trim()) {
          const nameParts = name.split(' ');
          const firstName = nameParts[0]?.toLowerCase().replace(/[äöüß]/g, c =>
            ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c)
          ) || '';
          const lastName = nameParts.slice(1).join('.').toLowerCase().replace(/[äöüß]/g, c =>
            ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c)
          ) || '';
          email = `${firstName}.${lastName}@${emailDomain.trim()}`.replace(/\.+/g, '.');
        }

        // Create student
        const studentData = {
          name,
          class_id: classData.id,
          user_id: currentUserId,
          email,
          account_id: null,
        };

        const newStudentRecord = await Student.create(studentData);
        importedStudents.push(newStudentRecord);

        // Auto-create account if auto-email is enabled with valid domain
        if (autoEmailEnabled && emailDomain.trim()) {
          try {
            const result = await User.createStudentAccount({
              studentId: newStudentRecord.id,
              email,
              name,
            });

            if (result.success) {
              createdAccounts.push({ name, email, password: result.password });
            }
          } catch (accountError) {
            console.warn(`Could not create account for ${name}:`, accountError);
          }
        }

        await delay(200); // Rate limiting
      }

      await loadStudents();
      onStudentsChange?.();
      setImportText('');
      setShowImportSection(false);

      if (createdAccounts.length > 0) {
        setCreatedCredentials(createdAccounts);
        setShowCredentialsModal(true);
        toast.success(`${importedStudents.length} Schüler importiert, ${createdAccounts.length} Accounts erstellt`);
      } else {
        toast.success(`${importedStudents.length} Schüler importiert`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Fehler beim Import');
    } finally {
      setIsImporting(false);
    }
  };

  // === Inline Editing ===
  const handleSaveEdit = async (studentId, field, value) => {
    try {
      // Leere E-Mail als null speichern (PocketBase akzeptiert keine leeren Strings für E-Mail)
      const finalValue = field === 'email' && value.trim() === '' ? null : value;
      await Student.update(studentId, { [field]: finalValue });
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, [field]: finalValue } : s))
      );
      setEditingStudent(null);
      onStudentsChange?.();
      toast.success(field === 'name' ? 'Name aktualisiert' : 'E-Mail aktualisiert');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // === Delete Email (set to null) ===
  const handleDeleteEmail = async (studentId) => {
    try {
      await Student.update(studentId, { email: null });
      setStudents(prev =>
        prev.map(s => (s.id === studentId ? { ...s, email: null } : s))
      );
      onStudentsChange?.();
      toast.success('E-Mail entfernt');
    } catch (error) {
      console.error('Error removing email:', error);
      toast.error('Fehler beim Entfernen der E-Mail');
    }
  };

  // === Delete Student ===
  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Schüler wirklich löschen? Alle zugehörigen Daten werden ebenfalls gelöscht.')) {
      return;
    }

    // Optimistic UI update
    setStudents(prev => prev.filter(s => s.id !== studentId));

    try {
      // Delete related data first
      const [performances, ueberfachlich] = await Promise.all([
        Performance.filter({ student_id: studentId }),
        UeberfachlichKompetenz.filter({ student_id: studentId }),
      ]);

      for (const perf of performances) {
        await deleteWithRetry(() => Performance.delete(perf.id));
        await delay(50);
      }

      for (const ueber of ueberfachlich) {
        await deleteWithRetry(() => UeberfachlichKompetenz.delete(ueber.id));
        await delay(50);
      }

      await deleteWithRetry(() => Student.delete(studentId));
      onStudentsChange?.();
      toast.success('Schüler gelöscht');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Fehler beim Löschen');
      await loadStudents(); // Revert on error
    }
  };

  // === Password Reset ===
  const handleResetPassword = async (student) => {
    if (!student.account_id) {
      toast.error('Dieser Schüler hat noch keinen Account');
      return;
    }

    try {
      const result = await User.resetStudentPassword(student.account_id);

      if (result.success) {
        setCreatedCredentials([
          { name: student.name, email: student.email, password: result.password },
        ]);
        setShowCredentialsModal(true);
        toast.success('Passwort zurückgesetzt');
      } else {
        toast.error(result.error || 'Fehler beim Zurücksetzen');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Fehler beim Zurücksetzen');
    }
  };

  // === Create Accounts for Students without Account ===
  const handleCreateAccounts = async () => {
    const studentsWithoutAccount = students.filter(
      s => !s.account_id && s.email && !s.email.includes('@school.example.com')
    );

    if (studentsWithoutAccount.length === 0) {
      toast.error('Keine Schüler mit gültiger E-Mail ohne Account gefunden');
      return;
    }

    setIsCreatingAccounts(true);
    const newAccounts = [];

    try {
      for (const student of studentsWithoutAccount) {
        const result = await User.createStudentAccount({
          studentId: student.id,
          email: student.email,
          name: student.name,
        });

        if (result.success) {
          newAccounts.push({
            name: student.name,
            email: student.email,
            password: result.password,
          });
        } else {
          toast.error(`Fehler bei ${student.name}: ${result.error}`);
        }

        await delay(200);
      }

      if (newAccounts.length > 0) {
        setCreatedCredentials(newAccounts);
        setShowCredentialsModal(true);
        toast.success(`${newAccounts.length} Account(s) erstellt`);
        await loadStudents();
        onStudentsChange?.();
      }
    } catch (error) {
      console.error('Error creating accounts:', error);
      toast.error('Fehler beim Erstellen der Accounts');
    } finally {
      setIsCreatingAccounts(false);
    }
  };

  // === Generate Emails for Existing Students + Auto-Create Accounts ===
  const handleGenerateEmails = async () => {
    if (!generatorDomain.trim()) {
      toast.error('Bitte Domain eingeben');
      return;
    }

    const studentsWithoutValidEmail = students.filter(
      s => !s.email || s.email.includes('@school.example.com')
    );

    if (studentsWithoutValidEmail.length === 0) {
      toast.error('Alle Schüler haben bereits eine gültige E-Mail');
      return;
    }

    setIsGeneratingEmails(true);
    const createdAccounts = [];

    try {
      for (const student of studentsWithoutValidEmail) {
        const nameParts = student.name.split(' ');
        const firstName = nameParts[0]?.toLowerCase().replace(/[äöüß]/g, c =>
          ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c)
        ) || '';
        const lastName = nameParts.slice(1).join('.').toLowerCase().replace(/[äöüß]/g, c =>
          ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[c] || c)
        ) || '';
        const newEmail = `${firstName}.${lastName}@${generatorDomain.trim()}`.replace(/\.+/g, '.');

        // Update email first
        await Student.update(student.id, { email: newEmail });

        // Create account if student doesn't have one
        if (!student.account_id) {
          try {
            const result = await User.createStudentAccount({
              studentId: student.id,
              email: newEmail,
              name: student.name,
            });

            if (result.success) {
              createdAccounts.push({
                name: student.name,
                email: newEmail,
                password: result.password
              });
            }
          } catch (accountError) {
            console.warn(`Could not create account for ${student.name}:`, accountError);
          }
        }

        await delay(150);
      }

      await loadStudents();
      onStudentsChange?.();
      setShowEmailGenerator(false);
      setGeneratorDomain('');

      if (createdAccounts.length > 0) {
        setCreatedCredentials(createdAccounts);
        setShowCredentialsModal(true);
        toast.success(`${createdAccounts.length} Account(s) erstellt`);
      } else {
        toast.success('E-Mails generiert');
      }
    } catch (error) {
      console.error('Error generating emails:', error);
      toast.error('Fehler beim Generieren der E-Mails');
    } finally {
      setIsGeneratingEmails(false);
    }
  };

  // === Show ALL Credentials (for all students with account) ===
  // Auto-generiert fehlende Passwörter via Reset
  const handleShowAllCredentials = async () => {
    const studentsWithAccount = students.filter(s => s.account_id && s.email);

    if (studentsWithAccount.length === 0) {
      toast.error('Keine Schüler mit Account gefunden');
      return;
    }

    // Für Schüler ohne gespeichertes Passwort: Auto-Reset
    const credentials = [];
    for (const s of studentsWithAccount) {
      if (s.generated_password) {
        credentials.push({ name: s.name, email: s.email, password: s.generated_password });
      } else {
        // Passwort fehlt - automatisch zurücksetzen
        const result = await User.resetStudentPassword(s.account_id);
        if (result.success) {
          credentials.push({ name: s.name, email: s.email, password: result.password });
        } else {
          credentials.push({ name: s.name, email: s.email, password: '(Fehler)' });
        }
      }
    }

    // Aktualisiere lokale Liste
    await loadStudents();

    setCreatedCredentials(credentials);
    setShowCredentialsModal(true);
  };

  // === Show Single Student Credential ===
  // Auto-generiert fehlendes Passwort via Reset
  const handleShowSingleCredential = async (student) => {
    let password = student.generated_password;

    // Falls Passwort fehlt: automatisch zurücksetzen
    if (!password && student.account_id) {
      const result = await User.resetStudentPassword(student.account_id);
      if (result.success) {
        password = result.password;
        await loadStudents(); // Aktualisiere lokale Liste
      } else {
        password = '(Fehler)';
      }
    }

    setCreatedCredentials([{
      name: student.name,
      email: student.email,
      password: password || '(Kein Account)'
    }]);
    setShowCredentialsModal(true);
  };

  // Stats
  const studentsWithAccount = students.filter(s => s.account_id).length;
  const studentsWithValidEmail = students.filter(
    s => s.email && !s.email.includes('@school.example.com')
  );
  const studentsReadyForAccount = studentsWithValidEmail.filter(s => !s.account_id).length;
  const studentsWithoutValidEmail = students.filter(
    s => !s.email || s.email.includes('@school.example.com')
  ).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay with high z-index to appear above SettingsModal */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1001] backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col m-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Users className="w-5 h-5 text-blue-600" />
              Schülerverwaltung: {classData?.name || 'Klasse'}
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({students.length} Schüler)
              </span>
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">

          {/* Account Stats Bar */}
          {students.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 flex items-center justify-between gap-4 flex-wrap border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <span className="text-blue-700 dark:text-blue-300">
                  <strong>{studentsWithAccount}</strong>/{students.length} mit Account
                </span>
                {studentsReadyForAccount > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {studentsReadyForAccount} bereit für Account
                  </span>
                )}
                {studentsWithoutValidEmail > 0 && (
                  <span className="text-orange-500">
                    {studentsWithoutValidEmail} ohne E-Mail
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {studentsWithoutValidEmail > 0 && (
                  <Button
                    onClick={() => setShowEmailGenerator(!showEmailGenerator)}
                    variant="outline"
                    size="sm"
                    className="text-xs border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    E-Mails generieren
                  </Button>
                )}
                <Button
                  onClick={handleCreateAccounts}
                  disabled={isCreatingAccounts || studentsReadyForAccount === 0}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-xs"
                >
                  {isCreatingAccounts ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Erstelle...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3 h-3 mr-1" />
                      Accounts erstellen
                    </>
                  )}
                </Button>
                {studentsWithAccount > 0 && (
                  <Button
                    onClick={handleShowAllCredentials}
                    variant="outline"
                    size="sm"
                    className="text-xs border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                  >
                    <Printer className="w-3 h-3 mr-1" />
                    Zugangskarten ({studentsWithAccount})
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Email Generator Panel */}
          {showEmailGenerator && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-orange-700 dark:text-orange-300">
                  E-Mails generieren für {studentsWithoutValidEmail} Schüler:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    vorname.nachname@
                  </span>
                  <Input
                    value={generatorDomain}
                    onChange={e => setGeneratorDomain(e.target.value)}
                    placeholder="schule.ch"
                    className="w-40 h-8"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowEmailGenerator(false);
                      setGeneratorDomain('');
                    }}
                    className="text-xs"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleGenerateEmails}
                    disabled={isGeneratingEmails || !generatorDomain.trim()}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-xs"
                  >
                    {isGeneratingEmails ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Generiere...
                      </>
                    ) : (
                      <>
                        <Mail className="w-3 h-3 mr-1" />
                        Generieren
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add Student Section - NOW ABOVE LIST */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-4 space-y-4">
            {/* Single Student Form */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-500">Vorname</Label>
                  <Input
                    value={newStudent.first_name}
                    onChange={e =>
                      setNewStudent({ ...newStudent, first_name: e.target.value })
                    }
                    placeholder="Vorname"
                    className="h-9"
                    onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Nachname</Label>
                  <Input
                    value={newStudent.last_name}
                    onChange={e =>
                      setNewStudent({ ...newStudent, last_name: e.target.value })
                    }
                    placeholder="Nachname"
                    className="h-9"
                    onKeyDown={e => e.key === 'Enter' && handleAddStudent()}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddStudent}
                disabled={
                  isAddingStudent ||
                  !newStudent.first_name.trim() ||
                  !newStudent.last_name.trim()
                }
                className="bg-green-600 hover:bg-green-700 h-9"
              >
                {isAddingStudent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Hinzufügen
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportSection(!showImportSection)}
                className="h-9 border-slate-300 dark:border-slate-600"
              >
                {showImportSection ? (
                  <ChevronUp className="w-4 h-4 mr-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 mr-1" />
                )}
                <Upload className="w-4 h-4 mr-1" />
                Liste importieren
              </Button>
            </div>

            {/* Import Section */}
            {showImportSection && (
              <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-700/50 space-y-4">
                <h4 className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Schülerliste importieren
                </h4>

                {/* Textarea for names */}
                <div>
                  <Label className="text-sm text-slate-600 dark:text-slate-300">
                    Namen (einer pro Zeile):
                  </Label>
                  <Textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="Max Mustermann&#10;Anna Schmidt&#10;Peter Müller&#10;..."
                    className="h-28 mt-1 bg-white dark:bg-slate-800"
                  />
                </div>

                {/* Auto-Email Generation Option */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="auto-email"
                      checked={autoEmailEnabled}
                      onCheckedChange={setAutoEmailEnabled}
                    />
                    <Label htmlFor="auto-email" className="cursor-pointer">
                      E-Mail automatisch generieren
                    </Label>
                  </div>

                  {autoEmailEnabled && (
                    <div className="flex items-center gap-2 ml-6 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                      <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        vorname.nachname@
                      </span>
                      <Input
                        value={emailDomain}
                        onChange={e => setEmailDomain(e.target.value)}
                        placeholder="schule.ch"
                        className="w-48 h-8"
                      />
                    </div>
                  )}
                </div>

                {/* Info: Auto-Account-Erstellung */}
                {autoEmailEnabled && emailDomain.trim() && (
                  <div className="ml-6 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                    <span className="text-xs text-green-700 dark:text-green-300">
                      Accounts werden automatisch erstellt und Zugangskarten angezeigt
                    </span>
                  </div>
                )}

                {/* Import Button */}
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-200 dark:border-slate-600">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportSection(false);
                      setImportText('');
                      setAutoEmailEnabled(false);
                      setEmailDomain('');
                    }}
                    className="border-slate-300 dark:border-slate-600"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || !importText.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importiere...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importieren
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Student List */}
          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : sortedStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Keine Schüler in dieser Klasse</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    {/* Account Status Icon */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        student.account_id
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-400'
                      }`}
                      title={student.account_id ? 'Hat Account' : 'Kein Account'}
                    >
                      {student.account_id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </div>

                    {/* Name Field - Inline Editable */}
                    <div className="w-40 flex-shrink-0">
                      {editingStudent?.id === student.id &&
                      editingStudent?.field === 'name' ? (
                        <div className="flex gap-1">
                          <Input
                            value={editingStudent.value}
                            onChange={e =>
                              setEditingStudent({ ...editingStudent, value: e.target.value })
                            }
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter')
                                handleSaveEdit(student.id, 'name', editingStudent.value);
                              if (e.key === 'Escape') setEditingStudent(null);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              handleSaveEdit(student.id, 'name', editingStudent.value)
                            }
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingStudent(null)}
                          >
                            <X className="w-3 h-3 text-slate-400" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-left font-medium text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 px-2 py-1 rounded truncate w-full"
                          onClick={() =>
                            setEditingStudent({
                              id: student.id,
                              field: 'name',
                              value: student.name,
                            })
                          }
                          title="Klicken zum Bearbeiten"
                        >
                          {student.name}
                        </button>
                      )}
                    </div>

                    {/* Email Field - Inline Editable */}
                    <div className="flex-1 min-w-0">
                      {editingStudent?.id === student.id &&
                      editingStudent?.field === 'email' ? (
                        <div className="flex gap-1">
                          <Input
                            value={editingStudent.value}
                            onChange={e =>
                              setEditingStudent({ ...editingStudent, value: e.target.value })
                            }
                            className="h-7 text-sm flex-1"
                            placeholder="email@example.com"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter')
                                handleSaveEdit(student.id, 'email', editingStudent.value);
                              if (e.key === 'Escape') setEditingStudent(null);
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              handleSaveEdit(student.id, 'email', editingStudent.value)
                            }
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingStudent(null)}
                          >
                            <X className="w-3 h-3 text-slate-400" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className={`text-left text-sm px-2 py-1 rounded truncate w-full hover:bg-slate-200 dark:hover:bg-slate-600 ${
                            !student.email || student.email.includes('@school.example.com')
                              ? 'text-orange-500 italic'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                          onClick={() =>
                            setEditingStudent({
                              id: student.id,
                              field: 'email',
                              value: student.email || '',
                            })
                          }
                          title="Klicken zum Bearbeiten"
                        >
                          {!student.email || student.email.includes('@school.example.com')
                            ? 'E-Mail eingeben...'
                            : student.email}
                        </button>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1 flex-shrink-0">
                      {/* Password Reset (only if has account) */}
                      {student.account_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                          onClick={() => handleResetPassword(student)}
                          title="Passwort zurücksetzen"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                      )}

                      {/* QR Card (only if has account and email) */}
                      {student.account_id && student.email && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          onClick={() => handleShowSingleCredential(student)}
                          title="Zugangskarte anzeigen"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Delete Email (only if has email and no account) */}
                      {student.email && !student.account_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                          onClick={() => handleDeleteEmail(student.id)}
                          title="E-Mail entfernen"
                        >
                          <MailX className="w-4 h-4" />
                        </Button>
                      )}

                      {/* Delete Student */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                        onClick={() => handleDeleteStudent(student.id)}
                        title="Schüler löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Credentials Print Modal */}
      <CredentialsPrintModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        credentials={createdCredentials}
        className={classData?.name}
      />
    </>
  );
}
