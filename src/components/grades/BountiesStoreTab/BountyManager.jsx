import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle, Archive, Users, Coins, Flame, Zap, Trophy, Crown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import BountyCompletionModal from './BountyCompletionModal';

// 4 Stufen System (wie Achievements)
const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Einfach', icon: Zap, color: 'text-green-500' },
  { value: 'medium', label: 'Mittel', icon: Flame, color: 'text-blue-500' },
  { value: 'hard', label: 'Schwer', icon: Trophy, color: 'text-purple-500' },
  { value: 'legendary', label: 'Legendär', icon: Crown, color: 'text-orange-500' }
];

/**
 * BountyManager - Create and manage bounties
 */
export default function BountyManager({ bountyManager, students = [], activeClassId }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingBounty, setEditingBounty] = useState(null);
  const [completionModal, setCompletionModal] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward: 5,
    difficulty: 'medium',
    due_date: ''
  });

  const {
    activeBounties = [],
    archivedBounties = [],
    createBounty,
    updateBounty,
    deleteBounty,
    toggleBountyActive,
    completeBountyForStudents,
    getCompletionCount,
    isLoading
  } = bountyManager || {};

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      reward: 5,
      difficulty: 'medium',
      due_date: ''
    });
    setIsCreating(false);
    setEditingBounty(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Bitte Titel eingeben');
      return;
    }

    try {
      if (editingBounty) {
        await updateBounty(editingBounty.id, formData);
        toast.success('Bounty aktualisiert');
      } else {
        await createBounty({
          ...formData,
          class_ids: activeClassId ? [activeClassId] : []
        });
        toast.success('Bounty erstellt');
      }
      resetForm();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleEdit = (bounty) => {
    setFormData({
      title: bounty.title || '',
      description: bounty.description || '',
      reward: bounty.reward || 5,
      difficulty: bounty.difficulty || 'medium',
      due_date: bounty.due_date?.split('T')[0] || ''
    });
    setEditingBounty(bounty);
    setIsCreating(true);
  };

  const handleDelete = async (bountyId) => {
    if (window.confirm('Bounty wirklich löschen?')) {
      try {
        await deleteBounty(bountyId);
        toast.success('Bounty gelöscht');
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  const handleToggleActive = async (bounty) => {
    try {
      await toggleBountyActive(bounty.id);
      toast.success(bounty.is_active ? 'Bounty archiviert' : 'Bounty aktiviert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleCompletionSubmit = async (bountyId, selectedStudentIds, awardCurrencyFn) => {
    try {
      const results = await completeBountyForStudents(bountyId, selectedStudentIds, awardCurrencyFn);
      const successCount = results.filter(r => r.success).length;
      toast.success(`Bounty für ${successCount} Schüler abgeschlossen`);
      setCompletionModal(null);
    } catch (error) {
      toast.error('Fehler beim Abschliessen');
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
      {/* Create/Edit Form */}
      {isCreating ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingBounty ? 'Bounty bearbeiten' : 'Neues Bounty erstellen'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titel *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="z.B. Klassenzimmer aufräumen"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optionale Details zur Aufgabe..."
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Belohnung (Punkte)</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.reward}
                    onChange={(e) => setFormData(prev => ({ ...prev, reward: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Schwierigkeit</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  >
                    {DIFFICULTY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Fällig bis (optional)</label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit">
                  {editingBounty ? 'Speichern' : 'Erstellen'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Abbrechen
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Neues Bounty
        </Button>
      )}

      {/* Active Bounties */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Aktive Bounties ({activeBounties.length})
        </h3>

        {activeBounties.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Noch keine aktiven Bounties. Erstelle dein erstes Bounty!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 max-h-[45vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {activeBounties.map(bounty => {
              const difficulty = DIFFICULTY_OPTIONS.find(d => d.value === bounty.difficulty) || DIFFICULTY_OPTIONS[1];
              const DiffIcon = difficulty.icon;
              const completionCount = getCompletionCount?.(bounty.id) || 0;

              return (
                <Card key={bounty.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{bounty.title}</h4>
                          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 ${difficulty.color}`}>
                            <DiffIcon className="w-3 h-3" />
                            {difficulty.label}
                          </span>
                        </div>
                        {bounty.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{bounty.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-amber-500" />
                            {bounty.reward} Punkte
                          </span>
                          {bounty.due_date && (
                            <span>Bis: {new Date(bounty.due_date).toLocaleDateString('de-DE')}</span>
                          )}
                          {completionCount > 0 && (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              {completionCount}x erledigt
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCompletionModal(bounty)}
                          className="flex items-center gap-1"
                        >
                          <Users className="w-4 h-4" />
                          Erledigt
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(bounty)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleActive(bounty)}>
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(bounty.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived Bounties */}
      {archivedBounties.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-500">
            <Archive className="w-5 h-5" />
            Archiviert ({archivedBounties.length})
          </h3>
          <div className="grid gap-2 opacity-60 max-h-[25vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {archivedBounties.map(bounty => (
              <Card key={bounty.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <span>{bounty.title}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(bounty)}>
                      Reaktivieren
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(bounty.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completionModal && (
        <BountyCompletionModal
          bounty={completionModal}
          students={students}
          onClose={() => setCompletionModal(null)}
          onSubmit={handleCompletionSubmit}
        />
      )}
    </div>
  );
}
