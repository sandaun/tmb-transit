import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Line } from '@/src/domain/catalog/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';
import { useAppLanguage } from '@/src/i18n';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

interface LineRowProps {
  line: Line;
  onPress: (line: Line) => void;
  isFavorite: boolean;
  onFavoritePress: (line: Line) => void;
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

export function LineRow({ line, onPress, isFavorite, onFavoritePress }: LineRowProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const routeLabel = getRouteLabel(line);
  const supportLabel = line.mode === 'metro' ? t('metro') : t('bus');

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.rowContent, pressed && styles.rowPressed]}
        onPress={() => onPress(line)}
        accessibilityRole="button"
        accessibilityLabel={`${t('line_accessibility', { code: line.code })}${routeLabel ? `, ${routeLabel}` : ''}`}
      >
        <LineBadge color={line.color} lineCode={line.code} mode={line.mode} size="medium" shape="square" />
        <View style={styles.textWrap}>
          {routeLabel ? (
            <>
              <Text style={styles.route} numberOfLines={2}>{routeLabel}</Text>
              <Text style={styles.support} numberOfLines={1}>{supportLabel}</Text>
            </>
          ) : <Text style={styles.route} numberOfLines={1}>{supportLabel}</Text>}
        </View>
        <Text style={styles.chevron}>{'›'}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? t('line_unfavorite') : t('line_favorite')}
        hitSlop={8}
        style={styles.favoriteButton}
        onPress={() => onFavoritePress(line)}
      >
        <MaterialIcons name={isFavorite ? 'star' : 'star-border'} size={22} color={isFavorite ? palette.favorite : palette.textMuted} />
      </Pressable>
    </View>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: palette.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingLeft: 14,
  },
  rowPressed: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  route: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  support: {
    color: palette.textSubtle,
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chevron: {
    color: palette.textSubtle,
    fontSize: 22,
    fontWeight: '500',
  },
  favoriteButton: {
    width: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
