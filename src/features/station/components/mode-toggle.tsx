import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransportMode } from '@/src/domain/catalog/models';

interface ModeToggleProps {
  mode: TransportMode;
  onChange: (mode: TransportMode) => void;
}

const MODES: { value: TransportMode; label: string }[] = [
  { value: 'metro', label: 'Metro' },
  { value: 'bus', label: 'Bus' },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <View style={styles.container}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
      <View style={styles.row}>
        {MODES.map((entry) => {
          const active = entry.value === mode;
          return (
            <Pressable
              key={entry.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => onChange(entry.value)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {entry.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipActive: {
    backgroundColor: 'rgba(10, 19, 36, 0.86)',
  },
  chipText: {
    color: '#1D3557',
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#F4F8FF',
  },
});
