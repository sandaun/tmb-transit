import type { ServiceAlert } from '@/src/domain/alerts/models';
import type { AlertsTimeFilter } from '@/src/features/preferences/models';
import { lineKey } from '@/src/features/preferences/models';

export type OperatorFilter = 'all' | 'tmb' | 'fgc' | 'tram';

export interface AlertFilters {
  mineOnly: boolean;
  operator: OperatorFilter;
  time: AlertsTimeFilter;
}

export interface AlertFilterCounts {
  mine: number;
  operator: Record<OperatorFilter, number>;
  time: Record<AlertsTimeFilter, number>;
}

function alertMatchesMine(alert: ServiceAlert, favoriteLineKeys: Set<string>): boolean {
  return alert.affectedLines.some((line) => favoriteLineKeys.has(lineKey(line.mode, line.code)));
}

function alertMatchesTime(alert: ServiceAlert, filter: AlertsTimeFilter): boolean {
  return filter === 'all' || alert.kind === filter;
}

function alertMatchesOperator(alert: ServiceAlert, filter: OperatorFilter): boolean {
  return filter === 'all' || (alert.operator ?? 'tmb') === filter;
}

export function alertMatchesFilters(
  alert: ServiceAlert,
  filters: AlertFilters,
  favoriteLineKeys: Set<string>,
): boolean {
  return alertMatchesTime(alert, filters.time) &&
    alertMatchesOperator(alert, filters.operator) &&
    (!filters.mineOnly || alertMatchesMine(alert, favoriteLineKeys));
}

export function getAlertFilterCounts(
  alerts: ServiceAlert[],
  filters: AlertFilters,
  favoriteLineKeys: Set<string>,
): AlertFilterCounts {
  const matchesPersonalScope = (alert: ServiceAlert) =>
    !filters.mineOnly || alertMatchesMine(alert, favoriteLineKeys);
  const timeContext = alerts.filter((alert) =>
    alertMatchesOperator(alert, filters.operator) && matchesPersonalScope(alert));
  const operatorContext = alerts.filter((alert) =>
    alertMatchesTime(alert, filters.time) && matchesPersonalScope(alert));

  return {
    mine: alerts.filter((alert) =>
      alertMatchesTime(alert, filters.time) &&
      alertMatchesOperator(alert, filters.operator) &&
      alertMatchesMine(alert, favoriteLineKeys)).length,
    time: {
      all: timeContext.length,
      current: timeContext.filter((alert) => alert.kind === 'current').length,
      planned: timeContext.filter((alert) => alert.kind === 'planned').length,
    },
    operator: {
      all: operatorContext.length,
      tmb: operatorContext.filter((alert) => (alert.operator ?? 'tmb') === 'tmb').length,
      fgc: operatorContext.filter((alert) => alert.operator === 'fgc').length,
      tram: operatorContext.filter((alert) => alert.operator === 'tram').length,
    },
  };
}
