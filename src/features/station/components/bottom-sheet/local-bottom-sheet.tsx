import { BlurView } from 'expo-blur';
import {
  forwardRef,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { type Palette, useThemedStyles } from '@/src/design-system';
import { useAppLanguage } from '@/src/i18n';

interface LocalBottomSheetProps {
  detents: readonly number[];
  initialDetentIndex?: number;
  footer?: ReactNode;
  children: ReactNode;
  animatedBottomInset?: SharedValue<number>;
  onDetentChange?: (index: number) => void;
}

export interface LocalBottomSheetHandle {
  resize: (index: number) => void;
}

export const LOCAL_SHEET_MIN_HEIGHT = 116;
export const LOCAL_SHEET_BOTTOM_GAP = 12;

const SPRING_CONFIG = {
  damping: 110,
  stiffness: 900,
  mass: 4,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function findNearestIndex(heights: readonly number[], target: number): number {
  'worklet';
  let nearestIndex = 0;
  let nearestDistance = Math.abs((heights[0] ?? LOCAL_SHEET_MIN_HEIGHT) - target);

  for (let index = 1; index < heights.length; index += 1) {
    const distance = Math.abs(heights[index] - target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

export const LocalBottomSheet = forwardRef<
  LocalBottomSheetHandle,
  LocalBottomSheetProps
>(function LocalBottomSheet(
  {
    detents,
    initialDetentIndex = 0,
    footer,
    children,
    animatedBottomInset,
    onDetentChange,
  },
  ref,
) {
  const colorScheme = useColorScheme();
  const styles = useThemedStyles(createStyles);
  const { t } = useAppLanguage();
  const insets = useSafeAreaInsets();
  const [containerHeight, setContainerHeight] = useState(0);
  const activeIndexRef = useRef(initialDetentIndex);
  const internalBottomInset = useSharedValue(
    LOCAL_SHEET_MIN_HEIGHT + LOCAL_SHEET_BOTTOM_GAP,
  );
  const bottomInset = animatedBottomInset ?? internalBottomInset;
  const dragStartHeight = useSharedValue(LOCAL_SHEET_MIN_HEIGHT);
  const activeIndex = useSharedValue(initialDetentIndex);

  const snapHeights = useMemo(() => {
    if (containerHeight <= 0) {
      return detents.map(() => LOCAL_SHEET_MIN_HEIGHT);
    }

    const usableHeight = Math.max(
      LOCAL_SHEET_MIN_HEIGHT,
      containerHeight - Math.max(insets.top, 48) - LOCAL_SHEET_BOTTOM_GAP,
    );

    return detents.map((detent) =>
      Math.max(LOCAL_SHEET_MIN_HEIGHT, Math.round(usableHeight * detent)),
    );
  }, [containerHeight, detents, insets.top]);

  const notifyDetentChange = useCallback(
    (nextIndex: number) => {
      activeIndexRef.current = nextIndex;
      onDetentChange?.(nextIndex);
    },
    [onDetentChange],
  );

  const animateToIndex = useCallback(
    (nextIndex: number, notify = true) => {
      const boundedIndex = Math.min(
        Math.max(nextIndex, 0),
        Math.max(detents.length - 1, 0),
      );
      const nextHeight = snapHeights[boundedIndex] ?? LOCAL_SHEET_MIN_HEIGHT;

      activeIndex.set(boundedIndex);
      bottomInset.set(
        withSpring(nextHeight + LOCAL_SHEET_BOTTOM_GAP, SPRING_CONFIG),
      );

      if (notify) {
        notifyDetentChange(boundedIndex);
      } else {
        activeIndexRef.current = boundedIndex;
      }
    },
    [activeIndex, bottomInset, detents.length, notifyDetentChange, snapHeights],
  );

  const resizeGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .activeOffsetY([-4, 4])
      .failOffsetX([-24, 24])
      .onBegin(() => {
        cancelAnimation(bottomInset);
        dragStartHeight.set(bottomInset.get() - LOCAL_SHEET_BOTTOM_GAP);
      })
      .onUpdate((event) => {
        const minHeight = snapHeights[0] ?? LOCAL_SHEET_MIN_HEIGHT;
        const maxHeight = snapHeights[snapHeights.length - 1] ?? minHeight;
        const nextHeight = clamp(
          dragStartHeight.get() - event.translationY,
          minHeight,
          maxHeight,
        );

        bottomInset.set(nextHeight + LOCAL_SHEET_BOTTOM_GAP);
      })
      .onEnd((event) => {
        const currentHeight = bottomInset.get() - LOCAL_SHEET_BOTTOM_GAP;
        const projectedHeight = currentHeight - event.velocityY * 0.14;
        const nextIndex = findNearestIndex(snapHeights, projectedHeight);
        const nextHeight = snapHeights[nextIndex] ?? LOCAL_SHEET_MIN_HEIGHT;

        activeIndex.set(nextIndex);
        bottomInset.set(
          withSpring(nextHeight + LOCAL_SHEET_BOTTOM_GAP, {
            ...SPRING_CONFIG,
            velocity: -event.velocityY,
          }),
        );
        runOnJS(notifyDetentChange)(nextIndex);
      })
      .onFinalize((_event, success) => {
        if (success) {
          return;
        }

        const currentIndex = activeIndex.get();
        const nextHeight = snapHeights[currentIndex] ?? LOCAL_SHEET_MIN_HEIGHT;
        bottomInset.set(
          withSpring(nextHeight + LOCAL_SHEET_BOTTOM_GAP, SPRING_CONFIG),
        );
      });

    const tapGesture = Gesture.Tap().onEnd(() => {
      const currentIndex = activeIndex.get();
      const nextIndex =
        currentIndex >= detents.length - 1 ? 0 : currentIndex + 1;
      const nextHeight = snapHeights[nextIndex] ?? LOCAL_SHEET_MIN_HEIGHT;

      activeIndex.set(nextIndex);
      bottomInset.set(
        withSpring(nextHeight + LOCAL_SHEET_BOTTOM_GAP, SPRING_CONFIG),
      );
      runOnJS(notifyDetentChange)(nextIndex);
    });

    return Gesture.Exclusive(panGesture, tapGesture);
  }, [activeIndex, bottomInset, detents.length, dragStartHeight, notifyDetentChange, snapHeights]);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    height: Math.max(
      LOCAL_SHEET_MIN_HEIGHT,
      bottomInset.get() - LOCAL_SHEET_BOTTOM_GAP,
    ),
  }));

  useImperativeHandle(
    ref,
    () => ({
      resize: (nextIndex: number) => {
        animateToIndex(nextIndex);
      },
    }),
    [animateToIndex],
  );

  useEffect(() => {
    animateToIndex(activeIndexRef.current, false);
  }, [animateToIndex, snapHeights]);

  return (
    <View
      pointerEvents="box-none"
      style={styles.overlay}
      onLayout={(event) => {
        setContainerHeight(event.nativeEvent.layout.height);
      }}
    >
      <Animated.View
        style={[
          styles.sheet,
          animatedSheetStyle,
          { paddingBottom: insets.bottom },
        ]}
      >
        <BlurView
          intensity={52}
          tint={colorScheme}
          style={StyleSheet.absoluteFillObject}
        />

        <GestureDetector gesture={resizeGesture}>
          <View
            style={styles.handleButton}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('sheet_resize')}
            accessibilityActions={[
              { name: 'increment', label: t('sheet_expand') },
              { name: 'decrement', label: t('sheet_collapse') },
            ]}
            onAccessibilityTap={() => {
              const nextIndex =
                activeIndexRef.current >= detents.length - 1
                  ? 0
                  : activeIndexRef.current + 1;
              animateToIndex(nextIndex);
            }}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === 'increment') {
                animateToIndex(activeIndexRef.current + 1);
              } else if (event.nativeEvent.actionName === 'decrement') {
                animateToIndex(activeIndexRef.current - 1);
              }
            }}
          >
            <View style={styles.handle} />
          </View>
        </GestureDetector>

        <View style={styles.content}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
});

const createStyles = (palette: Palette) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    elevation: 40,
    zIndex: 40,
  },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: LOCAL_SHEET_BOTTOM_GAP,
    backgroundColor: palette.surfaceTranslucent,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    shadowColor: palette.shadow,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 18,
  },
  handleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: palette.textSubtle,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    backgroundColor: 'transparent',
  },
});
