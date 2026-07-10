import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Line, TransportMode } from '@/src/domain/catalog/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';
import { useAppLanguage } from '@/src/i18n';
import { type Palette, useThemedStyles } from '@/src/design-system';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SearchShellProps {
  lineCode: string;
  lines?: Line[];
  mode: TransportMode;
  onLineChange?: (lineCode: string) => void;
}

const CHIP_WIDTH = 46;
const CHIP_GAP = 6;
const SIDE_PADDING = 8;

export function SearchShell({
  lineCode,
  lines = [],
  mode,
  onLineChange,
}: SearchShellProps) {
  const colorScheme = useColorScheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!lines.length) return;

    const index = lines.findIndex((line) => line.code === lineCode);
    if (index < 0) return;

    scrollRef.current?.scrollTo({
      x: Math.max(0, index * (CHIP_WIDTH + CHIP_GAP) - SIDE_PADDING),
      animated: true,
    });
  }, [lineCode, lines]);

  if (lines.length === 0) {
    return (
      <View style={styles.container}>
        <BlurView intensity={40} tint={colorScheme} style={StyleSheet.absoluteFillObject} />
        <View style={styles.row}>
          <View style={[styles.chip, styles.chipActive]}>
            <LineBadge lineCode={lineCode} mode={mode} size="small" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={40} tint={colorScheme} style={StyleSheet.absoluteFillObject} />
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {lines.map((line) => {
          const selected = line.code === lineCode;

          return (
            <Pressable
              key={line.code}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('line_accessibility', { code: line.code })}
              style={[styles.chip, selected ? styles.chipActive : styles.chipInactive]}
              onPress={() => onLineChange?.(line.code)}
            >
              <LineBadge
                color={line.color}
                lineCode={line.code}
                mode={line.mode}
                size="small"
              />
            </Pressable>
          );
        })}
      </ScrollView>
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: CHIP_GAP,
    paddingHorizontal: SIDE_PADDING,
    paddingVertical: 6,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CHIP_WIDTH,
    height: CHIP_WIDTH,
    borderRadius: 14,
  },
  chipInactive: {
    opacity: 0.42,
  },
  chipActive: {
    backgroundColor: palette.surface,
    borderWidth: 2,
    borderColor: palette.accent,
    shadowColor: palette.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    transform: [{ scale: 1.04 }],
  },
});
