import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { TransportMode } from '@/src/domain/catalog/models';
import { RouteBadge } from '@/src/features/station/components/bottom-sheet/route-badge';
import { Text, type Palette, useThemedStyles } from '@/src/design-system';
import { useAppLanguage } from '@/src/i18n';

interface CollapsedSheetSummaryProps {
  title: string;
  subtitle: string;
  line?: {
    code: string;
    mode: TransportMode;
    color?: string;
  };
  icon?: ComponentProps<typeof MaterialIcons>['name'];
  onPress: () => void;
}

export function CollapsedSheetSummary({
  title,
  subtitle,
  line,
  icon = 'keyboard-arrow-up',
  onPress,
}: CollapsedSheetSummaryProps) {
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${t('sheet_expand')}`}
      style={styles.root}
      onPress={onPress}
    >
      {line ? (
        <RouteBadge
          lineCode={line.code}
          mode={line.mode}
          color={line.color}
          size="small"
        />
      ) : (
        <View style={styles.iconSurface}>
          <MaterialIcons name={icon} size={22} style={styles.icon} />
        </View>
      )}

      <View style={styles.textWrap}>
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Text numberOfLines={1} style={styles.subtitle}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.expandButton}>
        <MaterialIcons name="keyboard-arrow-up" size={24} style={styles.icon} />
      </View>
    </Pressable>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 74,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconSurface: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accentSoft,
  },
  icon: {
    color: palette.textMuted,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  subtitle: {
    marginTop: 2,
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  expandButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.divider,
  },
});
