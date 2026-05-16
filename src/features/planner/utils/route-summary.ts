import type { PlannedRoute } from '@/src/domain/planner/models';

export function formatDuration(totalSec: number): string {
  const minutes = Math.max(1, Math.round(totalSec / 60));
  return `${minutes} min`;
}

export function getTransitRoutes(route: PlannedRoute): string[] {
  const seen = new Set<string>();
  const routes: string[] = [];

  for (const leg of route.legs) {
    if (leg.mode !== 'transit' || !leg.route || seen.has(leg.route)) {
      continue;
    }
    seen.add(leg.route);
    routes.push(leg.route);
  }

  return routes;
}

export function getRouteSummary(route: PlannedRoute): string {
  const transit = getTransitRoutes(route);
  const transitLabel = transit.length > 0 ? transit.join(' + ') : 'Walk';
  const transferLabel = route.transfers === 0 ? 'direct' : `${route.transfers} transfer${route.transfers === 1 ? '' : 's'}`;
  return `${formatDuration(route.durationSec)} · ${transitLabel} · ${transferLabel}`;
}
