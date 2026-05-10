import { BlurView } from 'expo-blur';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BUS_FAMILIES,
  type BusLineFamily,
} from '@/src/features/catalog/utils/bus-line-family';

interface FamilyFilterProps {
  available: BusLineFamily[];
  selected: BusLineFamily | null;
  onChange: (family: BusLineFamily | null) => void;
}

export function FamilyFilter({ available, selected, onChange }: FamilyFilterProps) {
  if (available.length === 0) {
    return null;
  }

  const families = BUS_FAMILIES.filter((family) => available.includes(family.id));

  return (
    <View style={styles.container}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selected === null }}
          style={[styles.chip, selected === null ? styles.chipActive : null]}
          onPress={() => onChange(null)}
        >
          <Text
            style={[styles.chipText, selected === null ? styles.chipTextActive : null]}
          >
            Totes
          </Text>
        </Pressable>

        {families.map((family) => {
          const active = family.id === selected;

          return (
            <Pressable
              key={family.id}
              accessibilityRole="button"
              accessibilityLabel={family.description}
              accessibilityState={{ selected: active }}
              style={[styles.chip, active ? styles.chipActive : null]}
              onPress={() => onChange(family.id)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>
                {family.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: 'rgba(10, 19, 36, 0.86)',
  },
  chipText: {
    color: '#1D3557',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#F4F8FF',
  },
});
