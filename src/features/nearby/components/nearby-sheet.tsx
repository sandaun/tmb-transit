import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TransportMode } from '@/src/domain/catalog/models';
import { useAppLanguage } from '@/src/i18n';
import { Text, type Palette, useThemedStyles } from '@/src/design-system';

interface ModeOption {
  mode: TransportMode;
  source: ImageSource;
  logoWidth: number;
}

const AVAILABLE_MODES: ModeOption[] = [
  { mode: 'metro', source: require('@/assets/transport/metro.svg'), logoWidth: 23 },
  { mode: 'bus', source: require('@/assets/transport/bus.svg'), logoWidth: 19 },
  { mode: 'fgc', source: require('@/assets/transport/fgc.svg'), logoWidth: 19 },
  { mode: 'tram', source: require('@/assets/transport/tram.png'), logoWidth: 58 },
];

interface NearbySheetProps {
  activeModes: TransportMode[];
  onModesChange: (modes: TransportMode[]) => void;
}

export function NearbySheet({
  activeModes,
  onModesChange,
}: NearbySheetProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();

  const toggleMode = (mode: TransportMode) => {
    const nextModes = activeModes.includes(mode)
      ? activeModes.filter((activeMode) => activeMode !== mode)
      : [...activeModes, mode];

    if (nextModes.length > 0) {
      onModesChange(nextModes);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('nearby_filter_title')}</Text>
      <View style={styles.modeGrid}>
        {AVAILABLE_MODES.map(({ mode, source, logoWidth }) => {
          const selected = activeModes.includes(mode);

          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.modeButton, selected ? styles.modeButtonSelected : null]}
              onPress={() => toggleMode(mode)}
            >
              <Image
                accessibilityIgnoresInvertColors
                contentFit="contain"
                source={source}
                style={[styles.modeLogo, { width: logoWidth }]}
              />
              {mode === 'tram' ? null : (
                <Text style={[styles.modeLabel, selected ? styles.modeLabelSelected : null]}>
                  {t(mode)}
                </Text>
              )}
              <Text style={[styles.checkmark, selected ? null : styles.checkmarkHidden]}>✓</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 14,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '800',
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeButton: {
    minWidth: 88,
    minHeight: 42,
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  modeButtonSelected: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  modeLogo: {
    height: 19,
  },
  checkmark: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '900',
  },
  checkmarkHidden: {
    opacity: 0,
  },
  modeLabel: {
    flexShrink: 1,
    color: palette.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  modeLabelSelected: {
    color: palette.text,
  },
});
