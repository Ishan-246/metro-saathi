const base = { safety: 60, escalator_lift: 50, crowding: 45, ticketing: 30, cleanliness: 25, other: 20 };
const categoryLabel = { escalator_lift: 'Lift', safety: 'Safety', crowding: 'Crowding', ticketing: 'Ticketing', cleanliness: 'Cleanliness', other: 'Other' };

export function priorityDetails(analysis, similarToday = 0) {
  const priority = analysis.emergency ? 100 : Math.min(100,
    (base[analysis.category] ?? base.other) + (analysis.danger ? 25 : 0) +
    (analysis.vulnerable ? 10 : 0) + (analysis.crowded ? 10 : 0) + Math.min(similarToday * 5, 15));
  const label = priority === 100 && analysis.emergency ? 'Emergency' : priority >= 70 ? 'High' : priority >= 40 ? 'Medium' : 'Low';
  const team = analysis.category === 'escalator_lift' ? 'Maintenance'
    : analysis.category === 'cleanliness' ? 'Housekeeping'
      : ['crowding', 'safety'].includes(analysis.category) ? 'Station security'
        : analysis.category === 'ticketing' ? 'Ticketing desk' : 'Station manager';
  const reasonParts = [categoryLabel[analysis.category] ?? 'Other'];
  if (analysis.danger) reasonParts.push('danger reported');
  if (analysis.vulnerable) reasonParts.push('vulnerable commuter');
  if (analysis.crowded) reasonParts.push('crowding');
  if (similarToday) reasonParts.push(`${similarToday} similar`);
  return { priority, label, reason: reasonParts.join(' · '), team };
}
