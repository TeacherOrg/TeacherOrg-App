export const calculateWeightedGrade = (performances = []) => {
  let totalWeighted = 0;
  let totalWeight = 0;

  performances.forEach((p) => {
    const grade = p.grade;
    const weight = p.weight ?? 1; // ← Das ist der entscheidende Teil!

    if (typeof grade === "number" && grade > 0 && weight > 0) {
      totalWeighted += grade * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return 0;
  return Number((totalWeighted / totalWeight).toFixed(2));
};