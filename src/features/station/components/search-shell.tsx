import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  return (
    <View style={styles.modeRow}>
      <View style={[styles.modeChip, styles.modeChipActive]}>
        <Text style={[styles.modeChipText, styles.modeChipTextActive]}>Metro</Text>
      </View>
      {lines.length > 0 ? (
        <ScrollView
          horizontal
          style={styles.lineSelectorViewport}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.lineSelector}
        >
          {lines.map((line) => {
            const selected = line.code === lineCode;

            return (
              <Pressable
                key={line.code}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.lineModeChip,
                  selected ? styles.lineModeChipActive : null,
                ]}
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
      ) : (
        <View style={styles.lineModeChip}>
          <MetroLineBadge lineCode={lineCode} size="small" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: 'rgba(9, 18, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lineModeChip: {
    alignItems: 'center',
    borderRadius: 14,
    padding: 4,
    backgroundColor: 'rgba(9, 18, 36, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lineModeChipActive: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  lineSelector: {
    gap: 8,
    paddingRight: 2,
  },
  lineSelectorViewport: {
    flexShrink: 1,
  },
  modeChipActive: {
    backgroundColor: '#2A70FF',
    borderColor: '#2A70FF',
  },
  modeChipText: {
    color: '#D5E2FF',
    fontWeight: '700',
    fontSize: 15,
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
});
