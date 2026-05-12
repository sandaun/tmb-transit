import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';

interface NearbyControlProps {
  enabled: boolean;
  onToggle: () => void;
}

export function NearbyControl({ enabled, onToggle }: NearbyControlProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: enabled }}
      accessibilityLabel={enabled ? 'Amaga parades properes' : 'Mostra parades properes'}
      style={[styles.button, enabled ? styles.buttonActive : styles.buttonIdle]}
      onPress={onToggle}
    >
      <IconSymbol
        name="location.magnifyingglass"
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
  buttonIdle: {
    opacity: 0.82,
  },
  buttonActive: {
    backgroundColor: '#2A70FF',
    borderColor: '#2A70FF',
  },
});
