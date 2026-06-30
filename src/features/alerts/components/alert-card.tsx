import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { memo, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  ServiceAlertLine,
  ServiceAlertMode,
  ServiceAlertSeverity,
} from '@/src/domain/alerts/models';
import { LineBadge } from '@/src/features/catalog/components/line-badge';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

interface SeverityStyle {
  color: string;
  icon: MaterialIconName;
  label: string;
  softBackground: string;
}

const MAX_VISIBLE_LINES = 6;

const SEVERITY_STYLES: Record<ServiceAlertSeverity, SeverityStyle> = {
  disruption: {
    color: '#D92D20',
    icon: 'error-outline',
    label: 'Incidència',
    softBackground: '#FFF1F1',
  },
  warning: {
    color: '#B7791F',
    icon: 'warning-amber',
    label: 'Avís',
    softBackground: '#FFF7E6',
  },
  info: {
    color: '#2563EB',
    icon: 'info-outline',
    label: 'Info',
    softBackground: '#EAF2FF',
  },
};

function getModeLabel(mode: ServiceAlertMode): string {
  if (mode === 'metro') {
    return 'Metro';
  }

  if (mode === 'bus') {
    return 'Bus';
  }

  return 'Metro + Bus';
}

interface AlertCardProps {
  title: string;
  description: string;
  mode: ServiceAlertMode;
  severity: ServiceAlertSeverity;
  affectedLines: ServiceAlertLine[];
  dateLabel?: string;
  sourceUrl?: string;
  onSourcePress: (sourceUrl: string) => void;
}

function AlertCardComponent({
  title,
  description,
  mode,
  severity,
  affectedLines,
  dateLabel,
  sourceUrl,
  onSourcePress,
}: AlertCardProps) {
  const severityStyle = SEVERITY_STYLES[severity];
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

          <Text style={styles.modeLabel}>{getModeLabel(mode)}</Text>
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
          {dateLabel ? (
            <Text style={styles.dateLabel} numberOfLines={1}>
              {dateLabel}
            </Text>
          ) : (
            <Text style={styles.dateLabel}>TMB</Text>
          )}

          {canOpenSource ? (
            <MaterialIcons name="open-in-new" size={17} color="#7A8AA1" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const AlertCard = memo(AlertCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    minHeight: 156,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E4E7EB',
  },
  cardPressed: {
    backgroundColor: '#F7FAFF',
    borderColor: '#B8CCFF',
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
    color: '#4F5D75',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0B1220',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  description: {
    color: '#4F5D75',
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
    backgroundColor: '#EEF2F7',
  },
  overflowText: {
    color: '#4F5D75',
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
    color: '#7A8AA1',
    fontSize: 13,
    fontWeight: '600',
  },
});
