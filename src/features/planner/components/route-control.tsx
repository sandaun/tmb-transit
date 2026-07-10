import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppLanguage } from '@/src/i18n';
import { usePalette, useThemedStyles, type Palette } from '@/src/design-system';

interface RouteControlProps {
  enabled: boolean;
  onPress: () => void;
}

export function RouteControl({ enabled, onPress }: RouteControlProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: enabled }}
      accessibilityLabel={enabled ? t('planner_close') : t('planner_open')}
      style={[styles.button, enabled ? styles.buttonActive : null]}
      onPress={onPress}
    >
      <IconSymbol
        name="arrow.triangle.turn.up.right.diamond.fill"
        size={22}
        color={enabled ? palette.onAccent : palette.textMuted}
        weight="semibold"
      />
    </Pressable>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceTranslucent,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
});
