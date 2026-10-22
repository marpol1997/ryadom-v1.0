/** Детерминированный цвет аватара по логину — без запросов к БД. */
const COLORS = ['#4f46e5', '#0ea5e9', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#6366f1'];

export function colorFor(value: string): string {
  let sum = 0;
  for (const char of String(value)) sum += char.charCodeAt(0);
  const index = sum % COLORS.length;
  return COLORS[index] ?? COLORS[0]!;
}
