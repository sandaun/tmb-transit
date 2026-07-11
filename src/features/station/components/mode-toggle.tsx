import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TransportMode } from '@/src/domain/catalog/models';
import { Text, type Palette, useThemedStyles } from '@/src/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppLanguage } from '@/src/i18n';

interface ModeToggleProps {
  mode: TransportMode;
  pendingMode?: TransportMode | null;
  onChange: (mode: TransportMode) => void;
}

const MODES: TransportMode[] = ['metro', 'bus', 'fgc'];

export function ModeToggle({ mode, pendingMode = null, onChange }: ModeToggleProps) {
  const colorScheme = useColorScheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  return (
    <View style={styles.container}>
      <BlurView intensity={40} tint={colorScheme} style={StyleSheet.absoluteFillObject} />
      <View style={styles.row}>
        {MODES.map((entry) => {
          const active = entry === (pendingMode ?? mode);
          return (
            <Pressable
              key={entry}
              accessibilityRole="button"
              accessibilityState={{
                busy: entry === pendingMode,
                disabled: pendingMode !== null,
                selected: active,
              }}
              disabled={pendingMode !== null}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => onChange(entry)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {t(entry)}
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
