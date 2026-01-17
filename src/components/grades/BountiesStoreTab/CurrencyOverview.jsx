import React, { useState, useMemo, useEffect } from 'react';
import { Coins, TrendingUp, TrendingDown, Edit, Loader2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCurrency } from '@/components/student-dashboard/hooks/useCurrency';
import { useStudentSortPreference } from '@/hooks/useStudentSortPreference';
import { sortStudents } from '@/utils/studentSortUtils';

/**
 * CurrencyOverview - View and manage student currency balances
 */
export default function CurrencyOverview({ currencyData = [], students = [], isLoading }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustingStudent, setAdjustingStudent] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [sortPreference] = useStudentSortPreference();

  // Escape key handler for modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && adjustingStudent) {
        setAdjustingStudent(null);
        setAdjustAmount(0);
        setAdjustReason('');
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [adjustingStudent]);

  // Map currency data to students
  const studentCurrencyMap = currencyData.reduce((acc, c) => {
    acc[c.student_id] = c;
    return acc;
  }, {});

  // Filter students by search
  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by global student sort preference
  const sortedStudents = useMemo(() =>
    sortStudents(filteredStudents, sortPreference),
    [filteredStudents, sortPreference]
  );

  // Calculate totals
  const totalBalance = Object.values(studentCurrencyMap).reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalEarned = Object.values(studentCurrencyMap).reduce((sum, c) => sum + (c.lifetime_earned || 0), 0);
  const totalSpent = Object.values(studentCurrencyMap).reduce((sum, c) => sum + (c.lifetime_spent || 0), 0);

  // Handle adjustment (this is a simplified version - in production you'd need to call the API)
  const handleAdjustment = async () => {
    if (!adjustingStudent || adjustAmount === 0) {
      toast.error('Bitte Betrag eingeben');
      return;
    }

    try {
      // In production, call an API to adjust currency
      // For now, show info message
      toast.info(`Anpassung wird gespeichert: ${adjustAmount > 0 ? '+' : ''}${adjustAmount} für ${adjustingStudent.name}`);
      setAdjustingStudent(null);
      setAdjustAmount(0);
      setAdjustReason('');
    } catch (error) {
      toast.error('Fehler bei der Anpassung');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4 text-center">
            <Coins className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-amber-600">{totalBalance}</div>
            <div className="text-sm text-amber-700 dark:text-amber-400">Gesamtguthaben</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-green-600">{totalEarned}</div>
            <div className="text-sm text-green-700 dark:text-green-400">Total verdient</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-purple-600">{totalSpent}</div>
            <div className="text-sm text-purple-700 dark:text-purple-400">Total ausgegeben</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Schüler suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Student List */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[calc(100vh-450px)] min-h-[200px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <th className="text-left p-3 font-medium">Schüler</th>
                  <th className="text-right p-3 font-medium">Aktuell</th>
                  <th className="text-right p-3 font-medium">Verdient</th>
                  <th className="text-right p-3 font-medium">Ausgegeben</th>
                  <th className="text-right p-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {sortedStudents.map(student => {
                  const currency = studentCurrencyMap[student.id];
                  const balance = currency?.balance || 0;
                  const earned = currency?.lifetime_earned || 0;
                  const spent = currency?.lifetime_spent || 0;

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="font-medium">{student.name}</div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-bold ${balance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                          {balance}
                        </span>
                      </td>
                      <td className="p-3 text-right text-green-600">{earned}</td>
                      <td className="p-3 text-right text-purple-600">{spent}</td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAdjustingStudent(student)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {sortedStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {searchQuery ? 'Keine Schüler gefunden' : 'Keine Schüler in dieser Klasse'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Modal */}
      {adjustingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Punkte anpassen: {adjustingStudent.name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Betrag (+ oder -)</label>
                  <Input
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                    placeholder="z.B. 5 oder -3"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Positive Werte hinzufügen, negative abziehen
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Grund</label>
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="z.B. Bonus für Hilfsbereitschaft"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button onClick={handleAdjustment} disabled={adjustAmount === 0}>
                    Speichern
                  </Button>
                  <Button variant="outline" onClick={() => setAdjustingStudent(null)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
