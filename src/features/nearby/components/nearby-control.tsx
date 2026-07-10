import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppLanguage } from '@/src/i18n';
import type { TransportMode } from '@/src/domain/catalog/models';
import { Text, type Palette, usePalette, useThemedStyles } from '@/src/design-system';

const SIZE = 48;
const COLLAPSED_WIDTH = SIZE;
const EXPANDED_WIDTH = 200;
const EXPAND_DURATION = 240;
const COLLAPSE_DURATION = 200;
const AUTO_COLLAPSE_MS = 4000;

const MODE_CHIPS: { mode: TransportMode; label: string }[] = [
  { mode: 'metro', label: 'Metro' },
  { mode: 'bus', label: 'Bus' },
];

interface NearbyControlProps {
  enabled: boolean;
  activeModes: TransportMode[];
  onToggle: () => void;
  onModesChange: (modes: TransportMode[]) => void;
}

export function NearbyControl({
  enabled,
  activeModes,
  onToggle,
  onModesChange,
}: NearbyControlProps) {
  const palette = usePalette();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const [expanded, setExpanded] = useState(false);
  const widthAnim = useRef(new Animated.Value(COLLAPSED_WIDTH)).current;
  const chipsOpacity = useRef(new Animated.Value(0)).current;
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
  }, []);

  const collapse = useCallback(() => {
    clearCollapseTimer();
    setExpanded(false);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: COLLAPSED_WIDTH,
        duration: COLLAPSE_DURATION,
        useNativeDriver: false,
      }),
      Animated.timing(chipsOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: false,
      }),
    ]).start();
  }, [chipsOpacity, clearCollapseTimer, widthAnim]);

  const scheduleAutoCollapse = useCallback(() => {
    clearCollapseTimer();
    collapseTimer.current = setTimeout(collapse, AUTO_COLLAPSE_MS);
  }, [clearCollapseTimer, collapse]);

  const expand = useCallback(() => {
    setExpanded(true);
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: EXPANDED_WIDTH,
        duration: EXPAND_DURATION,
        useNativeDriver: false,
      }),
      Animated.timing(chipsOpacity, {
        toValue: 1,
        duration: EXPAND_DURATION,
        useNativeDriver: false,
      }),
    ]).start();
    scheduleAutoCollapse();
  }, [chipsOpacity, scheduleAutoCollapse, widthAnim]);

  useEffect(() => clearCollapseTimer, [clearCollapseTimer]);

  const handlePress = useCallback(() => {
    if (expanded) {
      collapse();
      return;
    }
    onToggle();
  }, [collapse, expanded, onToggle]);

  const handleLongPress = useCallback(() => {
    if (!enabled) {
      onToggle();
    }
    if (expanded) {
      collapse();
    } else {
      expand();
    }
  }, [collapse, enabled, expand, expanded, onToggle]);

  const toggleMode = useCallback(
    (mode: TransportMode) => {
      scheduleAutoCollapse();

      const next = activeModes.includes(mode)
        ? activeModes.filter((m) => m !== mode)
        : [...activeModes, mode];

      if (next.length === 0) {
        collapse();
        onToggle();
        return;
      }
      onModesChange(next);
    },
    [activeModes, collapse, onModesChange, onToggle, scheduleAutoCollapse],
  );

  return (
    <Animated.View
      style={[
        styles.pill,
        {
          width: widthAnim,
          backgroundColor: enabled ? palette.accent : palette.surfaceTranslucent,
          borderColor: enabled ? palette.accent : palette.borderStrong,
        },
      ]}
    >
      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        style={[styles.chipsRow, { opacity: chipsOpacity }]}
      >
        {MODE_CHIPS.map(({ mode, label }) => {
          const active = activeModes.includes(mode);
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                active ? (enabled ? styles.chipOnActive : styles.chipOnIdle) : null,
              ]}
              onPress={() => toggleMode(mode)}
            >
              <Text
                style={[
                  styles.chipText,
                  active ? styles.chipTextActive : null,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: enabled }}
        accessibilityLabel={enabled ? t('nearby_hide') : t('nearby_show')}
        style={styles.iconHitArea}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        <IconSymbol
          name="location.magnifyingglass"
          size={22}
          color={enabled ? palette.onAccent : palette.textMuted}
          weight="semibold"
        />
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  pill: {
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
    overflow: 'hidden',
  },
  iconHitArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    paddingLeft: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOnIdle: {
    backgroundColor: palette.divider,
  },
  chipOnActive: {
    backgroundColor: palette.accentSoft,
  },
  chipText: {
    color: palette.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: palette.onAccent,
  },
});
