import { BlurView } from 'expo-blur';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Line } from '@/src/domain/catalog/models';
import { MetroLineBadge } from '@/src/features/catalog/components/metro-line-badge';

interface SearchShellProps {
  lineCode: string;
  lines?: Line[];
  onLineChange?: (lineCode: string) => void;
}

export function SearchShell({
  lineCode,
  lines = [],
  onLineChange,
}: SearchShellProps) {
  if (lines.length === 0) {
    return (
      <View style={styles.container}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
        <View style={styles.row}>
          <View style={styles.chip}>
            <MetroLineBadge lineCode={lineCode} size="small" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFillObject} />
      <ScrollView
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
              style={[styles.chip, selected ? styles.chipActive : null]}
              onPress={() => onLineChange?.(line.code)}
            >
              <MetroLineBadge
                color={line.color}
                lineCode={line.code}
                size="small"
              />
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 3,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});
