import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type {
  ServiceAlertKind,
  ServiceAlertLine,
  ServiceAlertMode,
  ServiceAlertSeverity,
} from '@/src/domain/alerts/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';
import { formatDateTime, useAppLanguage } from '@/src/i18n';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

interface SeverityStyle {
  color: string;
  icon: MaterialIconName;
  label: string;
  softBackground: string;
}

const MAX_VISIBLE_LINES = 6;

function getModeLabel(
  mode: ServiceAlertMode,
  metro: string,
  bus: string,
  fgc: string,
  mixed: string,
): string {
  if (mode === 'metro') {
    return metro;
  }

  if (mode === 'bus') {
    return bus;
  }

  if (mode === 'fgc') {
    return fgc;
  }

  return mixed;
}

function getKindLabel(kind: ServiceAlertKind, current: string, planned: string): string {
  return kind === 'current' ? current : planned;
}

interface AlertCardProps {
  title: string;
  description: string;
  mode: ServiceAlertMode;
  severity: ServiceAlertSeverity;
  kind: ServiceAlertKind;
  affectedLines: ServiceAlertLine[];
  dateLabel?: string;
  updatedAtMs?: number;
  sourceUrl?: string;
  onSourcePress: (sourceUrl: string) => void;
}

function AlertCardComponent({
  title,
  description,
  mode,
  severity,
  kind,
  affectedLines,
  dateLabel,
  updatedAtMs,
  sourceUrl,
  onSourcePress,
}: AlertCardProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { language, t } = useAppLanguage();
  const severityStyles: Record<ServiceAlertSeverity, SeverityStyle> = {
    disruption: { color: palette.danger, icon: 'error-outline', label: t('alert_disruption'), softBackground: palette.dangerSoft },
    warning: { color: palette.warning, icon: 'warning-amber', label: t('alert_warning'), softBackground: palette.warningSoft },
    info: { color: palette.info, icon: 'info-outline', label: t('alert_info'), softBackground: palette.infoSoft },
  };
  const severityStyle = severityStyles[severity];
  const visibleLines = affectedLines.slice(0, MAX_VISIBLE_LINES);
  const hiddenLineCount = Math.max(affectedLines.length - visibleLines.length, 0);
  const canOpenSource = Boolean(sourceUrl);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && canOpenSource ? styles.cardPressed : null]}
      onPress={() => {
        if (sourceUrl) {
          onSourcePress(sourceUrl);
        }
      }}
      disabled={!canOpenSource}
      accessibilityRole={canOpenSource ? 'button' : undefined}
      accessibilityLabel={`${title}. ${description}`}>
      <View style={[styles.severityRail, { backgroundColor: severityStyle.color }]} />

      <View style={styles.content}>
        <View style={styles.metaRow}>
          <View style={[styles.severityPill, { backgroundColor: severityStyle.softBackground }]}>
            <MaterialIcons name={severityStyle.icon} size={16} color={severityStyle.color} />
            <Text style={[styles.severityText, { color: severityStyle.color }]}>
              {severityStyle.label}
            </Text>
          </View>

          <Text style={styles.modeLabel}>
            {getKindLabel(kind, t('alerts_now'), t('alerts_planned'))} · {getModeLabel(mode, t('metro'), t('bus'), t('fgc'), t('alert_metro_bus'))}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={3}>
          {title}
        </Text>

        {description ? (
          <Text style={styles.description} numberOfLines={5}>
            {description}
          </Text>
        ) : null}

        {visibleLines.length > 0 ? (
          <View style={styles.linesRow}>
            {visibleLines.map((line) => (
              <LineBadge
                key={`${line.mode}:${line.code}`}
                lineCode={line.code}
                mode={line.mode}
                size="small"
                shape="pill"
              />
            ))}
            {hiddenLineCount > 0 ? (
              <View style={styles.overflowPill}>
                <Text style={styles.overflowText}>+{hiddenLineCount}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.footerRow}>
          {updatedAtMs || dateLabel ? (
            <Text style={styles.dateLabel} numberOfLines={1}>
              {updatedAtMs ? formatDateTime(language, updatedAtMs) : dateLabel}
            </Text>
          ) : (
            <Text style={styles.dateLabel}>TMB</Text>
          )}

          {canOpenSource ? (
            <MaterialIcons name="open-in-new" size={17} color={palette.textSubtle} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const AlertCard = memo(AlertCardComponent);

const createStyles = (palette: Palette) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    minHeight: 156,
    overflow: 'hidden',
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.border,
  },
  cardPressed: {
    backgroundColor: palette.accentSoft,
    borderColor: palette.accent,
  },
  severityRail: {
    width: 5,
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modeLabel: {
    flexShrink: 0,
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  description: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  linesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  overflowPill: {
    minWidth: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: palette.divider,
  },
  overflowText: {
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 20,
  },
  dateLabel: {
    flex: 1,
    minWidth: 0,
    color: palette.textSubtle,
    fontSize: 13,
    fontWeight: '600',
  },
});
