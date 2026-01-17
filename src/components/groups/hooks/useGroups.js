import { useState, useEffect, useCallback } from "react";
import pb from '@/api/pb';
import { Student, Class, Group } from "@/api/entities";

// Neue API-Wrapper für group_sets – du kannst das auch in entities erweitern
const GroupSet = {
  async list(filter = '') {
    return await pb.collection('group_sets').getFullList({ filter });
  },
  async create(data) {
    return await pb.collection('group_sets').create(data);
  },
  async update(id, data) {
    return await pb.collection('group_sets').update(id, data);
  },
  async delete(id) {
    return await pb.collection('group_sets').delete(id);
  },
  async get(id) {
    return await pb.collection('group_sets').getOne(id);
  }
};

export function useGroups(initialClassId = null, onClassIdChange = null) {
  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassIdInternal] = useState(initialClassId);
  const [groups, setGroups] = useState([]);
  const [savedGroupSets, setSavedGroupSets] = useState([]);
  const [numGroups, setNumGroups] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = pb.authStore.model?.id;

  // Wrapper für setActiveClassId der optionalen Callback aufruft
  const setActiveClassId = (newClassId) => {
    setActiveClassIdInternal(newClassId);
    if (onClassIdChange) {
      onClassIdChange(newClassId);
    }
  };

  // Sync initialClassId → State (wenn von außen geändert)
  useEffect(() => {
    if (initialClassId !== activeClassId && initialClassId !== null) {
      setActiveClassIdInternal(initialClassId);
    }
  }, [initialClassId]);

  // Initiales Laden mit Team Teaching
  useEffect(() => {
    const loadInitial = async () => {
      if (!userId) {
        setIsLoading(false);
        setError("No authenticated user.");
        return;
      }

      setIsLoading(true);
      try {
        // Lade eigene Daten + Team Teaching parallel
        const [students, ownedClasses, sets, teamTeachingAccess] = await Promise.all([
          Student.list(),
          Class.list(),
          GroupSet.list(`user_id = "${userId}"`),
          pb.collection('team_teachings').getFullList({
            // WICHTIG: owner_id != userId um Self-Team-Teaching-Records auszuschließen
            filter: `invited_user_id = '${userId}' && status = 'accepted' && owner_id != '${userId}'`,
            expand: 'class_id,owner_id',
            $autoCancel: false
          }).catch(() => [])
        ]);

        // Eigene Klassen mit Metadaten
        const ownedWithMeta = (ownedClasses || []).map(cls => ({
          ...cls,
          isOwner: true,
          permissionLevel: 'full_access'
        }));

        // Geteilte Klassen (nur nicht-versteckte) - MIT Owner-ID für Gruppen-Ladung
        const sharedClasses = teamTeachingAccess
          .filter(tt => (tt.expand?.class_id || tt.class_id) && !tt.is_hidden)
          .map(tt => ({
            ...(tt.expand?.class_id || {}),
            id: tt.expand?.class_id?.id || tt.class_id,
            name: tt.expand?.class_id?.name || tt.class_name || 'Geteilte Klasse',
            isOwner: false,
            permissionLevel: tt.permission_level || 'view_only',
            teamTeachingId: tt.id,
            ownerEmail: tt.expand?.owner_id?.email || '',
            // NEU: Owner-ID für Gruppen-Ladung (Co-Teacher soll Owner's Gruppen sehen)
            teamTeachingOwnerId: tt.owner_id
          }));

        // Deduplizierung (owned hat Priorität)
        const merged = [...ownedWithMeta, ...sharedClasses];
        const uniqueClasses = merged.reduce((acc, cls) => {
          const existing = acc.find(c => c.id === cls.id);
          if (!existing) {
            acc.push(cls);
          } else if (cls.isOwner && !existing.isOwner) {
            const idx = acc.findIndex(c => c.id === cls.id);
            acc[idx] = cls;
          }
          return acc;
        }, []);

        // Lade Schüler von geteilten Klassen
        const visibleSharedClassIds = teamTeachingAccess
          .filter(tt => !tt.is_hidden)
          .map(tt => tt.class_id);

        let sharedStudents = [];
        if (visibleSharedClassIds.length > 0) {
          for (const classId of visibleSharedClassIds) {
            const classStudents = await pb.collection('students').getFullList({
              filter: `class_id = '${classId}'`,
              $autoCancel: false
            }).catch(() => []);
            sharedStudents = [...sharedStudents, ...classStudents];
          }
        }

        setAllStudents([...(students || []), ...sharedStudents]);
        setClasses(uniqueClasses);
        setSavedGroupSets(sets);

        // Setze activeClassId nur wenn nicht von außen vorgegeben
        if (uniqueClasses.length > 0 && !activeClassId && !initialClassId) {
          const firstClassId = uniqueClasses[0].id;
          setActiveClassIdInternal(firstClassId);
          if (onClassIdChange) {
            onClassIdChange(firstClassId);
          }
        }
      } catch (err) {
        setError("Failed to load initial data.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitial();
  }, [userId]);

  // Gruppen laden, wenn Klasse wechselt
  // NEU: Für geteilte Klassen die Owner-ID verwenden, damit Co-Teacher die Gruppen des Owners sieht
  const loadGroupsForClass = useCallback(async (classId) => {
    if (!classId) {
      setGroups([]);
      return;
    }

    try {
      // Prüfe ob es eine geteilte Klasse ist (mit teamTeachingOwnerId)
      const targetClass = classes.find(c => c.id === classId);
      const ownerIdForGroups = targetClass?.teamTeachingOwnerId || userId;

      const fetched = await Group.list({
        filter: `class_id = "${classId}" && user_id = "${ownerIdForGroups}"`
      });
      setGroups(fetched);
    } catch (err) {
      setError("Failed to load groups.");
      console.error(err);
      setGroups([]);
    }
  }, [userId, classes]);

  useEffect(() => {
    loadGroupsForClass(activeClassId);
  }, [activeClassId, loadGroupsForClass]);

  const handleClassChange = (classId) => {
    setActiveClassId(classId);
  };

  const handleCreateGroups = async () => {
    if (!activeClassId) return;

    try {
      // Alte Gruppen löschen
      await Group.batchDelete(groups.map(g => g.id));

      const newGroups = [];
      for (let i = 1; i <= numGroups; i++) {
        const group = await Group.create({
          user_id: userId,
          class_id: activeClassId,
          name: `Group ${i}`,
          student_ids: []
        });
        newGroups.push(group);
      }
      setGroups(newGroups);
    } catch (err) {
      setError("Failed to create groups.");
      console.error(err);
    }
  };

  const handleRandomize = async () => {
    if (!activeClassId || groups.length === 0) return;

    const studentIds = allStudents
      .filter(s => s.class_id === activeClassId)
      .map(s => s.id.toString());

    // Fisher-Yates Shuffle
    for (let i = studentIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [studentIds[i], studentIds[j]] = [studentIds[j], studentIds[i]];
    }

    try {
      const updated = await Promise.all(
        groups.map(async (group, index) => {
          const start = Math.floor(index * studentIds.length / groups.length);
          const end = Math.floor((index + 1) * studentIds.length / groups.length);
          const idsForGroup = studentIds.slice(start, end);

          await Group.update(group.id, { student_ids: idsForGroup });
          return { ...group, student_ids: idsForGroup };
        })
      );
      setGroups(updated);
    } catch (err) {
      setError("Failed to randomize.");
      console.error(err);
    }
  };

  const handleClearGroups = async () => {
    if (!window.confirm("Clear all groups for this class?")) return;

    try {
      await Group.batchDelete(groups.map(g => g.id));
      setGroups([]);
    } catch (err) {
      setError("Failed to clear groups.");
      console.error(err);
    }
  };

  const handleSaveCurrentAsSet = async (name) => {
    if (!name.trim()) return;

    try {
      await GroupSet.create({
        name,
        class_id: activeClassId,
        user_id: userId,
        groups: groups.map(g => ({ name: g.name, student_ids: g.student_ids }))
      });

      const updatedSets = await GroupSet.list(`user_id = "${userId}"`);
      setSavedGroupSets(updatedSets);
    } catch (err) {
      setError("Failed to save group set.");
      console.error(err);
    }
  };

  const handleLoadGroupSet = async (setId) => {
    if (!setId) return;

    try {
      const set = await GroupSet.get(setId);

      // Alte Gruppen löschen
      await Group.batchDelete(groups.map(g => g.id));

      // Neue aus Set erstellen
      const newGroups = await Promise.all(
        set.groups.map(async (g) => {
          return await Group.create({
            user_id: userId,
            class_id: activeClassId,
            name: g.name,
            student_ids: g.student_ids || []
          });
        })
      );

      setGroups(newGroups);
    } catch (err) {
      setError("Failed to load group set.");
      console.error(err);
    }
  };

  const handleDeleteGroupSet = async (setId) => {
    if (!window.confirm("Diese gespeicherte Gruppeneinteilung löschen?")) return;

    try {
        await GroupSet.delete(setId);

        // Optional: Wenn das gelöschte Set gerade aktiv war → Gruppen leeren
        // (nur wenn du das möchtest – ansonsten weglassen)
        // await Group.batchDelete(groups.map(g => g.id));
        // setGroups([]);

        setSavedGroupSets(prev => prev.filter(s => s.id !== setId));
    } catch (err) {
        setError("Fehler beim Löschen des Group Sets");
    }
    };

  const handleRenameGroupSet = async (setId, newName) => {
    if (!newName.trim()) return;

    try {
      await GroupSet.update(setId, { name: newName });
      setSavedGroupSets(prev =>
        prev.map(s => s.id === setId ? { ...s, name: newName } : s)
      );
    } catch (err) {
      setError("Failed to rename group set.");
      console.error(err);
    }
  };

  const handleRenameGroup = async (groupId, newName) => {
    if (!newName.trim()) return;

    try {
      await Group.update(groupId, { name: newName });
      setGroups(prev =>
        prev.map(g => g.id === groupId ? { ...g, name: newName } : g)
      );
    } catch (err) {
      setError("Fehler beim Umbenennen der Gruppe.");
      console.error(err);
    }
  };

  return {
    allStudents,
    classes,
    activeClassId,
    groups,
    setGroups,
    savedGroupSets,
    numGroups,
    setNumGroups,
    isLoading,
    error,
    setError,
    handleClassChange,
    handleCreateGroups,
    handleRandomize,
    handleClearGroups,
    handleSaveCurrentAsSet,
    handleLoadGroupSet,
    handleDeleteGroupSet,
    handleRenameGroupSet,
    handleRenameGroup,
  };
}