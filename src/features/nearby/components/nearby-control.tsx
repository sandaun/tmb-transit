import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { TransportMode } from '@/src/domain/catalog/models';

interface NearbyControlProps {
  enabled: boolean;
  modes: TransportMode[];
  onToggle: () => void;
  onChangeModes: (modes: TransportMode[]) => void;
}

const MODE_FILTERS: { id: TransportMode; label: string }[] = [
  { id: 'metro', label: 'Metro' },
  { id: 'bus', label: 'Bus' },
];

export function NearbyControl({ enabled, modes, onToggle, onChangeModes }: NearbyControlProps) {
  function toggleMode(mode: TransportMode) {
    if (modes.includes(mode)) {
      if (modes.length === 1) return;
      onChangeModes(modes.filter((entry) => entry !== mode));
    } else {
      onChangeModes([...modes, mode]);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: enabled }}
        accessibilityLabel="Mostrar parades properes"
        style={[styles.toggle, enabled ? styles.toggleActive : null]}
        onPress={onToggle}
      >
        <IconSymbol
          name="location.magnifyingglass"
          size={20}
          color={enabled ? '#F4F8FF' : '#AFC2E8'}
          weight="semibold"
        />
        <Text style={[styles.toggleLabel, enabled ? styles.toggleLabelActive : null]}>
          Properes
        </Text>
      </Pressable>

      {enabled ? (
        <View style={styles.modes}>
          {MODE_FILTERS.map((filter) => {
            const active = modes.includes(filter.id);
            return (
              <Pressable
                key={filter.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.modeChip, active ? styles.modeChipActive : null]}
                onPress={() => toggleMode(filter.id)}
              >
                <Text
                  style={[styles.modeChipText, active ? styles.modeChipTextActive : null]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-end',
    gap: 6,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 19, 36, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  toggleActive: {
    backgroundColor: '#2A70FF',
    borderColor: '#2A70FF',
  },
  toggleLabel: {
    color: '#AFC2E8',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleLabelActive: {
    color: '#FFFFFF',
  },
  modes: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(10, 19, 36, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modeChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  modeChipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  modeChipText: {
    color: '#9FB1D4',
    fontSize: 12,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: '#F4F8FF',
  },
});
