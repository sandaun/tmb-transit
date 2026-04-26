import { StyleSheet, Text, View } from 'react-native';

import { getMetroLineBrand } from '@/src/features/catalog/utils/metro-line-brand';

interface MetroLineBadgeProps {
  color?: string;
  lineCode: string;
  size?: 'small' | 'medium' | 'large';
}

export function MetroLineBadge({
  color,
  lineCode,
  size = 'medium',
}: MetroLineBadgeProps) {
  const brand = getMetroLineBrand(lineCode, color);

  return (
    <View
      style={[
        styles.badge,
        sizeStyles[size].badge,
        { backgroundColor: brand.backgroundColor },
      ]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.text,
          sizeStyles[size].text,
          { color: brand.textColor },
        ]}>
        {brand.label}
      </Text>
    </View>
  );
}

const sizeStyles = {
  small: {
    badge: {
      width: 34,
      height: 34,
      borderRadius: 10,
    },
    text: {
      fontSize: 14,
    },
  },
  medium: {
    badge: {
      width: 46,
      height: 46,
      borderRadius: 14,
    },
    text: {
      fontSize: 18,
    },
  },
  large: {
    badge: {
      width: 52,
      height: 52,
      borderRadius: 16,
    },
    text: {
      fontSize: 20,
    },
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
