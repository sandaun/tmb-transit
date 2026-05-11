import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Line } from '@/src/domain/catalog/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';

interface LineRowProps {
  line: Line;
  onPress: (line: Line) => void;
}

function getRouteLabel(line: Line): string | null {
  if (line.originStation && line.destinationStation) {
    return `${line.originStation} ↔ ${line.destinationStation}`;
  }

  if (line.name && line.name.toUpperCase() !== line.code.toUpperCase()) {
    return line.name;
  }

  return null;
}

export function LineRow({ line, onPress }: LineRowProps) {
  const routeLabel = getRouteLabel(line);
  const supportLabel = line.mode === 'metro' ? 'Metro' : 'Bus';

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(line)}
      accessibilityRole="button"
      accessibilityLabel={`Línia ${line.code}${routeLabel ? `, ${routeLabel}` : ''}`}
    >
      <LineBadge
        color={line.color}
        lineCode={line.code}
        mode={line.mode}
        size="medium"
        shape="square"
      />
      <View style={styles.textWrap}>
        {routeLabel ? (
          <>
            <Text style={styles.route} numberOfLines={2}>
              {routeLabel}
            </Text>
            <Text style={styles.support} numberOfLines={1}>
              {supportLabel}
            </Text>
          </>
        ) : (
          <Text style={styles.route} numberOfLines={1}>
            {supportLabel}
          </Text>
        )}
      </View>
      <Text style={styles.chevron}>{'›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  rowPressed: {
    backgroundColor: '#EAF1FF',
    borderColor: '#0B5FFF',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  route: {
    color: '#0B1220',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  support: {
    color: '#7A8AA1',
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chevron: {
    color: '#90A4AE',
    fontSize: 22,
    fontWeight: '500',
  },
});
