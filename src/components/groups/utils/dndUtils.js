export function arrayMove(arr, fromIndex, toIndex) {
  const newArr = [...arr];
  const [element] = newArr.splice(fromIndex, 1);
  newArr.splice(toIndex, 0, element);
  return newArr;
}

export function findContainer(studentId, groups, unassignedStudents) {
  if (studentId === 'unassigned') return 'unassigned';

  const group = groups.find(g => g.student_ids.includes(studentId));
  if (group) return group.id;

  return 'unassigned';
}