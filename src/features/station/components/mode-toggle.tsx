import { BlurView } from 'expo-blur';
import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TransportMode } from '@/src/domain/catalog/models';
import { type Palette, useThemedStyles } from '@/src/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppLanguage } from '@/src/i18n';

interface ModeToggleProps {
  mode: TransportMode;
  pendingMode?: TransportMode | null;
  onChange: (mode: TransportMode) => void;
}

interface ModeBrand {
  mode: TransportMode;
  source: ImageSource;
  width: number;
}

const MODES: ModeBrand[] = [
  { mode: 'metro', source: require('@/assets/transport/metro.svg'), width: 27 },
  { mode: 'bus', source: require('@/assets/transport/bus.svg'), width: 22 },
  { mode: 'fgc', source: require('@/assets/transport/fgc.svg'), width: 22 },
];

export function ModeToggle({ mode, pendingMode = null, onChange }: ModeToggleProps) {
  const colorScheme = useColorScheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  return (
    <View style={styles.container}>
      <BlurView intensity={40} tint={colorScheme} style={StyleSheet.absoluteFillObject} />
      <View style={styles.row}>
        {MODES.map(({ mode: entry, source, width }) => {
          const active = entry === (pendingMode ?? mode);
          return (
            <Pressable
              key={entry}
              accessibilityRole="button"
              accessibilityLabel={t(entry)}
              accessibilityState={{
                busy: entry === pendingMode,
                disabled: pendingMode !== null,
                selected: active,
              }}
              disabled={pendingMode !== null}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : null,
                pressed ? styles.chipPressed : null,
              ]}
              onPress={() => onChange(entry)}
            >
              <Image
                accessibilityIgnoresInvertColors
                contentFit="contain"
                source={source}
                style={[styles.logo, { width }]}
              />
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
    padding: 3,
    gap: 2,
  },
  chip: {
    width: 64,
    height: 36,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: palette.accentSoft,
  },
  chipPressed: {
    opacity: 0.68,
  },
  logo: {
    height: 22,
  },
});
