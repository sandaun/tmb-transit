import { StyleSheet, Text, View } from 'react-native';

interface RouteBadgeProps {
  lineCode: string;
  size?: 'small' | 'large';
}

export function RouteBadge({ lineCode, size = 'small' }: RouteBadgeProps) {
  const isLarge = size === 'large';

  return (
    <View style={isLarge ? styles.badgeLarge : styles.badge}>
      <Text style={isLarge ? styles.textLarge : styles.text}>{lineCode}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E03A31',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  badgeLarge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E03A31',
  },
  textLarge: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
});
