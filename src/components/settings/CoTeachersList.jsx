import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserMinus, Eye, Edit, Clock, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTeamTeaching } from '@/hooks/useTeamTeaching';
import { formatPermissionLevel, formatInvitationStatus } from '@/utils/teamTeachingUtils';

export default function CoTeachersList({ classId, onUpdate }) {
  const [coTeachers, setCoTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const { getCoTeachers, revokeAccess, updatePermission } = useTeamTeaching();

  // Co-Teacher laden
  useEffect(() => {
    const loadCoTeachers = async () => {
      if (!classId) return;

      setIsLoading(true);
      try {
        const teachers = await getCoTeachers(classId);
        setCoTeachers(teachers);
      } catch (error) {
        console.error('Error loading co-teachers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCoTeachers();
  }, [classId, getCoTeachers]);

  const handleRevoke = async (teacherId, email) => {
    if (!window.confirm(`Möchten Sie ${email} wirklich den Zugriff entziehen?`)) {
      return;
    }

    setUpdatingId(teacherId);
    try {
      const result = await revokeAccess(teacherId);
      if (result.success) {
        toast.success('Zugriff entzogen');
        setCoTeachers(prev => prev.filter(t => t.id !== teacherId));
        onUpdate?.();
      } else {
        toast.error(result.error || 'Fehler beim Entziehen des Zugriffs');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePermissionChange = async (teacherId, newPermission) => {
    setUpdatingId(teacherId);
    try {
      const result = await updatePermission(teacherId, newPermission);
      if (result.success) {
        toast.success('Berechtigung aktualisiert');
        setCoTeachers(prev =>
          prev.map(t =>
            t.id === teacherId ? { ...t, permissionLevel: newPermission } : t
          )
        );
        onUpdate?.();
      } else {
        toast.error(result.error || 'Fehler beim Aktualisieren');
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Lade Co-Teacher...</span>
      </div>
    );
  }

  if (coTeachers.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-2">
        Keine Co-Teacher fuer diese Klasse.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {coTeachers.map((teacher) => (
        <div
          key={teacher.id}
          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Status Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              teacher.status === 'accepted' ? 'bg-green-600/20' : 'bg-yellow-600/20'
            }`}>
              {teacher.status === 'accepted' ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Clock className="w-4 h-4 text-yellow-400" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {teacher.email}
              </p>
              <p className="text-xs text-slate-400">
                {teacher.status === 'pending' ? (
                  <span className="text-yellow-400">Einladung ausstehend</span>
                ) : (
                  formatPermissionLevel(teacher.permissionLevel)
                )}
              </p>
            </div>
          </div>

          {/* Aktionen */}
          <div className="flex items-center gap-2">
            {teacher.status === 'accepted' && (
              <Select
                value={teacher.permissionLevel}
                onValueChange={(value) => handlePermissionChange(teacher.id, value)}
                disabled={updatingId === teacher.id}
              >
                <SelectTrigger className="w-32 h-8 bg-slate-700 border-slate-600 text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="view_only" className="text-white text-xs">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3 h-3 text-blue-400" />
                      Nur Einsicht
                    </div>
                  </SelectItem>
                  <SelectItem value="full_access" className="text-white text-xs">
                    <div className="flex items-center gap-2">
                      <Edit className="w-3 h-3 text-green-400" />
                      Vollzugriff
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400 hover:bg-red-900/30 hover:text-red-300"
              onClick={() => handleRevoke(teacher.id, teacher.email)}
              disabled={updatingId === teacher.id}
              title="Zugriff entziehen"
            >
              {updatingId === teacher.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
