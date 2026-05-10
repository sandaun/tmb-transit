import type { TransportMode } from '@/src/domain/catalog/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';

interface RouteBadgeProps {
  lineCode: string;
  mode: TransportMode;
  size?: 'small' | 'large';
}

export function RouteBadge({ lineCode, mode, size = 'small' }: RouteBadgeProps) {
  return <LineBadge lineCode={lineCode} mode={mode} size={size} />;
}
