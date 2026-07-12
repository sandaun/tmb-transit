import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppLanguage } from '@/src/i18n';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

interface NearbyControlProps {
  enabled: boolean;
  selectedModeCount: number;
  onToggle: () => void;
  onConfigure: () => void;
}

export function NearbyControl({
  enabled,
  selectedModeCount,
  onToggle,
  onConfigure,
}: NearbyControlProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();

  return (
    <View style={styles.controls}>
      {enabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nearby_configure')}
          style={styles.filterButton}
          onPress={onConfigure}
        >
          <IconSymbol
            name="line.3.horizontal.decrease"
            size={19}
            color={palette.textMuted}
            weight="semibold"
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{selectedModeCount}</Text>
          </View>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: enabled }}
        accessibilityLabel={enabled ? t('nearby_hide') : t('nearby_show')}
        style={[styles.button, enabled ? styles.buttonActive : null]}
        onPress={onToggle}
      >
        <IconSymbol
          name="location.magnifyingglass"
          size={22}
          color={enabled ? palette.accent : palette.textMuted}
          weight="semibold"
        />
      </Pressable>
    </View>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mapControlSurface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  buttonActive: {
    borderWidth: 2,
    borderColor: palette.accent,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.mapControlSurface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
    borderWidth: 2,
    borderColor: palette.surface,
  },
  badgeText: {
    color: palette.onAccent,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },
});
