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

export function useGroups() {
  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [activeClassId, setActiveClassId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [savedGroupSets, setSavedGroupSets] = useState([]);
  const [numGroups, setNumGroups] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = pb.authStore.model?.id;

  // Initiales Laden
  useEffect(() => {
    const loadInitial = async () => {
      if (!userId) {
        setIsLoading(false);
        setError("No authenticated user.");
        return;
      }

      setIsLoading(true);
      try {
        const [students, classesList, sets] = await Promise.all([
          Student.list(),
          Class.list(),
          GroupSet.list(`user_id = "${userId}"`)
        ]);

        setAllStudents(students);
        setClasses(classesList);
        setSavedGroupSets(sets);

        if (classesList.length > 0) {
          setActiveClassId(classesList[0].id);
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
  const loadGroupsForClass = useCallback(async (classId) => {
    if (!classId) {
      setGroups([]);
      return;
    }

    try {
      const fetched = await Group.list({
        filter: `class_id = "${classId}" && user_id = "${userId}"`
      });
      setGroups(fetched);
    } catch (err) {
      setError("Failed to load groups.");
      console.error(err);
      setGroups([]);
    }
  }, [userId]);

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