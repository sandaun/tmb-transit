import { MetroLineBadge } from '@/src/features/catalog/components/metro-line-badge';

interface RouteBadgeProps {
  lineCode: string;
  size?: 'small' | 'large';
}

export function RouteBadge({ lineCode, size = 'small' }: RouteBadgeProps) {
  return <MetroLineBadge lineCode={lineCode} size={size} />;
}
