import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppLanguage } from '@/src/i18n';

interface RouteControlProps {
  enabled: boolean;
  onPress: () => void;
}

export function RouteControl({ enabled, onPress }: RouteControlProps) {
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
        color={enabled ? '#FFFFFF' : '#AFC2E8'}
        weight="semibold"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 19, 36, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: '#2A70FF',
    borderColor: '#2A70FF',
  },
});
