import type { TransitOperator, TransportMode } from '@/src/domain/catalog/models';

export type ServiceAlertMode = TransportMode | 'mixed';
export type ServiceAlertSeverity = 'info' | 'warning' | 'disruption';
export type ServiceAlertKind = 'current' | 'planned';
export type ServiceAlertSource = 'tmb-alerts-api' | 'tmb-service-notices' | 'fgc-gtfs-rt';

export interface ServiceAlertLine {
  mode: TransportMode;
  operator?: TransitOperator;
  code: string;
}

export interface ServiceAlert {
  id: string;
  title: string;
  description: string;
  mode: ServiceAlertMode;
  operator?: TransitOperator;
  severity: ServiceAlertSeverity;
  kind: ServiceAlertKind;
  affectedLines: ServiceAlertLine[];
  source: ServiceAlertSource;
  sourceUrl?: string;
  dateLabel?: string;
  startsAtMs?: number;
  endsAtMs?: number;
  updatedAtMs?: number;
}
