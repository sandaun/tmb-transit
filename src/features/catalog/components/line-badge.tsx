import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import type { TransportMode } from '@/src/domain/catalog/models';
import { getLineBrand } from '@/src/features/catalog/utils/line-brand';

type Size = 'small' | 'medium' | 'large';
type Shape = 'square' | 'pill';

interface LineBadgeProps {
  color?: string;
  lineCode: string;
  mode: TransportMode;
  size?: Size;
  shape?: Shape;
}

export function LineBadge({
  color,
  lineCode,
  mode,
  size = 'medium',
  shape = 'square',
}: LineBadgeProps) {
  const brand = getLineBrand(mode, lineCode, color);
  const sizeStyle = sizeStyles[size];
  const shapeStyle: ViewStyle =
    shape === 'pill'
      ? {
          minWidth: sizeStyle.badge.width,
          width: 'auto',
          paddingHorizontal: sizeStyle.pillPadding,
          borderRadius: sizeStyle.badge.height / 2,
        }
      : {};

  return (
    <View
      style={[
        styles.badge,
        sizeStyle.badge,
        shapeStyle,
        { backgroundColor: brand.backgroundColor },
      ]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.text, sizeStyle.text, { color: brand.textColor }]}>
        {brand.label}
      </Text>
    </View>
  );
}

const sizeStyles = {
  small: {
    badge: { width: 34, height: 34, borderRadius: 10 },
    text: { fontSize: 14 },
    pillPadding: 8,
  },
  medium: {
    badge: { width: 46, height: 46, borderRadius: 14 },
    text: { fontSize: 18 },
    pillPadding: 10,
  },
  large: {
    badge: { width: 52, height: 52, borderRadius: 16 },
    text: { fontSize: 20 },
    pillPadding: 12,
  },
} as const;

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
  },
});
