import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Line } from '@/src/domain/catalog/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';

interface LineRowProps {
  line: Line;
  onPress: (line: Line) => void;
}

export function LineRow({ line, onPress }: LineRowProps) {
  const showName = line.name && line.name.toUpperCase() !== line.code.toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress(line)}
      accessibilityRole="button"
      accessibilityLabel={`Línia ${line.code}${showName ? `, ${line.name}` : ''}`}
    >
      <LineBadge
        color={line.color}
        lineCode={line.code}
        mode={line.mode}
        size="medium"
        shape="pill"
      />
      <View style={styles.textWrap}>
        <Text style={styles.code} numberOfLines={1}>
          {line.code}
        </Text>
        {showName ? (
          <Text style={styles.name} numberOfLines={1}>
            {line.name}
          </Text>
        ) : null}
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
    paddingHorizontal: 16,
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
  code: {
    color: '#0B1220',
    fontSize: 16,
    fontWeight: '700',
  },
  name: {
    color: '#4F5D75',
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: '#90A4AE',
    fontSize: 22,
    fontWeight: '500',
  },
});
