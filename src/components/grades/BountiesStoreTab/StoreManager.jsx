import React, { useState } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Loader2, Coins } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Default emoji picker options
const EMOJI_OPTIONS = ['🎯', '🎮', '🎵', '🎨', '🏃', '📚', '🌟', '🏆', '🎁', '🎪', '🎭', '🎬', '🪑', '☕', '🍎', '🎲'];

const CATEGORY_OPTIONS = [
  { value: 'privilege', label: 'Privileg' },
  { value: 'activity', label: 'Aktivität' },
  { value: 'reward', label: 'Belohnung' }
];

/**
 * StoreManager - Create and manage store items
 */
export default function StoreManager({ storeManager }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost: 10,
    icon: '🎯',
    category: 'privilege',
    is_active: true
  });

  const {
    items = [],
    createItem,
    updateItem,
    deleteItem,
    isLoading
  } = storeManager || {};

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cost: 10,
      icon: '🎯',
      category: 'privilege',
      is_active: true
    });
    setIsCreating(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Bitte Namen eingeben');
      return;
    }

    try {
      if (editingItem) {
        await updateItem(editingItem.id, formData);
        toast.success('Item aktualisiert');
      } else {
        await createItem(formData);
        toast.success('Item erstellt');
      }
      resetForm();
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name || '',
      description: item.description || '',
      cost: item.cost || 10,
      icon: item.icon || '🎯',
      category: item.category || 'privilege',
      is_active: item.is_active !== false
    });
    setEditingItem(item);
    setIsCreating(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Item wirklich löschen?')) {
      try {
        await deleteItem(itemId);
        toast.success('Item gelöscht');
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await updateItem(item.id, { is_active: !item.is_active });
      toast.success(item.is_active ? 'Item deaktiviert' : 'Item aktiviert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Group items by category
  const activeItems = items.filter(i => i.is_active);
  const inactiveItems = items.filter(i => !i.is_active);

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
            <CardTitle>{editingItem ? 'Item bearbeiten' : 'Neues Item erstellen'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. 5 Min Extra Pause"
                    maxLength={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Preis (Punkte)</label>
                  <Input
                    type="number"
                    min={1}
                    max={500}
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Beschreibung</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Was bekommt der Schüler?"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  rows={2}
                  maxLength={200}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Icon</label>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-lg dark:border-slate-700">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, icon: emoji }))}
                        className={`
                          w-8 h-8 text-xl rounded flex items-center justify-center transition-colors
                          ${formData.icon === emoji
                            ? 'bg-purple-100 dark:bg-purple-900 ring-2 ring-purple-500'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                          }
                        `}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Kategorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit">
                  {editingItem ? 'Speichern' : 'Erstellen'}
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
          Neues Item
        </Button>
      )}

      {/* Active Items */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Aktive Items ({activeItems.length})</h3>

        {activeItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-500">
              Noch keine Items. Erstelle dein erstes Store-Item!
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[45vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {activeItems.map(item => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{item.icon || '🎯'}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Coins className="w-4 h-4" />
                          {item.cost}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                          {CATEGORY_OPTIONS.find(c => c.value === item.category)?.label || item.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1 mt-3 pt-2 border-t dark:border-slate-700">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(item)}>
                      <ToggleRight className="w-4 h-4 text-green-500" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Items */}
      {inactiveItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-slate-500">Deaktiviert ({inactiveItems.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60 max-h-[25vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {inactiveItems.map(item => (
              <Card key={item.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleToggleActive(item)}>
                      <ToggleLeft className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
