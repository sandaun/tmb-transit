import type { TransportMode } from '@/src/domain/catalog/models';

export type ServiceAlertMode = TransportMode | 'mixed';
export type ServiceAlertSeverity = 'info' | 'warning' | 'disruption';

export interface ServiceAlertLine {
  mode: TransportMode;
  code: string;
}

export interface ServiceAlert {
  id: string;
  title: string;
  description: string;
  mode: ServiceAlertMode;
  severity: ServiceAlertSeverity;
  affectedLines: ServiceAlertLine[];
  source: 'tmb-service-notices';
  sourceUrl?: string;
  dateLabel?: string;
  startsAtMs?: number;
  endsAtMs?: number;
}
