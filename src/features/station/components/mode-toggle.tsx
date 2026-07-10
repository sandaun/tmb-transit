import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TransportMode } from '@/src/domain/catalog/models';
import { Text, type Palette, useThemedStyles } from '@/src/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ModeToggleProps {
  mode: TransportMode;
  onChange: (mode: TransportMode) => void;
}

const MODES: { value: TransportMode; label: string }[] = [
  { value: 'metro', label: 'Metro' },
  { value: 'bus', label: 'Bus' },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const colorScheme = useColorScheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <BlurView intensity={40} tint={colorScheme} style={StyleSheet.absoluteFillObject} />
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

const createStyles = (palette: Palette) => StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    shadowColor: palette.shadow,
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
    backgroundColor: palette.accent,
  },
  chipText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
  },
  chipTextActive: {
    color: palette.onAccent,
  },
});
