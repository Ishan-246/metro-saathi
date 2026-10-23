const stationOrder = ['Vanaz', 'Anand Nagar', 'Paud Phata', 'SNDT College', 'Garware College', 'Deccan Gymkhana', 'Chhatrapati Sambhaji Udyan', 'PMC Bhavan', 'District Court', 'RTO', 'Pune Railway Station', 'Ruby Hall Clinic', 'Bund Garden', 'Yerwada', 'Kalyani Nagar', 'Ramwadi'];
const WINDOW_MS = 60 * 60 * 1000;

export function groupIncidents(reports) {
  const byCategory = new Map();
  for (const report of reports) {
    if (!byCategory.has(report.category)) byCategory.set(report.category, []);
    byCategory.get(report.category).push(report);
  }

  const incidents = [];
  for (const categoryReports of byCategory.values()) {
    const unseen = new Set(categoryReports.map((r) => r.id));
    const reportById = new Map(categoryReports.map((r) => [r.id, r]));
    while (unseen.size) {
      const seedId = unseen.values().next().value;
      unseen.delete(seedId);
      const cluster = [reportById.get(seedId)];
      for (let cursor = 0; cursor < cluster.length; cursor += 1) {
        const current = cluster[cursor];
        const currentTime = new Date(current.createdAt).getTime();
        for (const candidate of [...unseen]) {
          const next = reportById.get(candidate);
          const currentStationIndex = stationOrder.indexOf(current.station);
          const nextStationIndex = stationOrder.indexOf(next.station);
          if (currentStationIndex < 0 || nextStationIndex < 0) continue;
          const stationDistance = Math.abs(currentStationIndex - nextStationIndex);
          const timeDistance = Math.abs(currentTime - new Date(next.createdAt).getTime());
          if (stationDistance <= 1 && timeDistance <= WINDOW_MS) {
            unseen.delete(candidate);
            cluster.push(next);
          }
        }
      }
      if (cluster.length < 2) continue;
      const stationNames = [...new Set(cluster.map((r) => r.station))].sort((a, b) => stationOrder.indexOf(a) - stationOrder.indexOf(b));
      const times = cluster.map((r) => new Date(r.createdAt).getTime());
      const highestPriority = Math.max(...cluster.map((r) => r.priority));
      const priority = Math.min(100, highestPriority + Math.min((stationNames.length - 1) * 5, 15));
      incidents.push({ category: cluster[0].category, stations: stationNames, reportCount: cluster.length, firstAt: new Date(Math.min(...times)).toISOString(), lastAt: new Date(Math.max(...times)).toISOString(), priority, label: priority === 100 ? 'Emergency' : priority >= 70 ? 'High' : priority >= 40 ? 'Medium' : 'Low', reportIds: cluster.map((r) => r.id) });
    }
  }
  return incidents.sort((a, b) => b.priority - a.priority || new Date(a.firstAt) - new Date(b.firstAt));
}
