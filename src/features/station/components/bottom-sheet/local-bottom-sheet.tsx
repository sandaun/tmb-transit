import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LocalBottomSheetProps {
  detents: readonly number[];
  initialDetentIndex?: number;
  footer?: ReactNode;
  children: ReactNode;
  onDetentChange?: (index: number) => void;
}

export interface LocalBottomSheetHandle {
  resize: (index: number) => void;
}

const MIN_SHEET_HEIGHT = 104;

export const LocalBottomSheet = forwardRef<
  LocalBottomSheetHandle,
  LocalBottomSheetProps
>(function LocalBottomSheet(
  {
    detents,
    initialDetentIndex = 0,
    footer,
    children,
    onDetentChange,
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const [containerHeight, setContainerHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(initialDetentIndex);
  const animatedHeight = useRef(new Animated.Value(MIN_SHEET_HEIGHT)).current;
  const activeIndexRef = useRef(initialDetentIndex);
  const currentHeightRef = useRef(MIN_SHEET_HEIGHT);
  const dragStartHeightRef = useRef(MIN_SHEET_HEIGHT);

  const snapHeights = useMemo(() => {
    if (containerHeight <= 0) {
      return detents.map(() => MIN_SHEET_HEIGHT);
    }

    const usableHeight = Math.max(
      MIN_SHEET_HEIGHT,
      containerHeight - Math.max(insets.top, 48),
    );

    return detents.map((detent) =>
      Math.max(MIN_SHEET_HEIGHT, Math.round(usableHeight * detent)),
    );
  }, [containerHeight, detents, insets.top]);

  const animateToIndex = useCallback(
    (nextIndex: number) => {
      const boundedIndex = Math.min(
        Math.max(nextIndex, 0),
        Math.max(detents.length - 1, 0),
      );
      const nextHeight = snapHeights[boundedIndex] ?? MIN_SHEET_HEIGHT;

      activeIndexRef.current = boundedIndex;
      setActiveIndex(boundedIndex);
      onDetentChange?.(boundedIndex);

      Animated.timing(animatedHeight, {
        toValue: nextHeight,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [animatedHeight, detents.length, onDetentChange, snapHeights],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          Math.abs(gestureState.dy) > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          dragStartHeightRef.current = currentHeightRef.current;
          animatedHeight.stopAnimation((height) => {
            currentHeightRef.current = height;
            dragStartHeightRef.current = height;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          const minHeight = snapHeights[0] ?? MIN_SHEET_HEIGHT;
          const maxHeight =
            snapHeights[snapHeights.length - 1] ?? MIN_SHEET_HEIGHT;
          const nextHeight = Math.min(
            Math.max(dragStartHeightRef.current - gestureState.dy, minHeight),
            maxHeight,
          );

          currentHeightRef.current = nextHeight;
          animatedHeight.setValue(nextHeight);
        },
        onPanResponderRelease: (_, gestureState) => {
          const isTap =
            Math.abs(gestureState.dx) < 6 && Math.abs(gestureState.dy) < 6;

          if (isTap) {
            const nextIndex =
              activeIndexRef.current >= detents.length - 1
                ? 0
                : activeIndexRef.current + 1;
            animateToIndex(nextIndex);
            return;
          }

          if (gestureState.vy < -0.75) {
            animateToIndex(activeIndexRef.current + 1);
            return;
          }

          if (gestureState.vy > 0.75) {
            animateToIndex(activeIndexRef.current - 1);
            return;
          }

          const nearestIndex = snapHeights.reduce(
            (nearest, height, index) => {
              const nearestDistance = Math.abs(
                height - currentHeightRef.current,
              );
              const previousDistance = Math.abs(
                snapHeights[nearest] - currentHeightRef.current,
              );

              return nearestDistance < previousDistance ? index : nearest;
            },
            0,
          );

          animateToIndex(nearestIndex);
        },
        onPanResponderTerminate: () => {
          animateToIndex(activeIndexRef.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [animateToIndex, animatedHeight, detents.length, snapHeights],
  );

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
    animateToIndex(activeIndex);
  }, [activeIndex, animateToIndex, snapHeights]);

  useEffect(() => {
    const listenerId = animatedHeight.addListener(({ value }) => {
      currentHeightRef.current = value;
    });

    return () => {
      animatedHeight.removeListener(listenerId);
    };
  }, [animatedHeight]);

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
          {
            height: animatedHeight,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <BlurView intensity={58} tint="dark" style={StyleSheet.absoluteFillObject} />

        <View
          {...panResponder.panHandlers}
          style={styles.handleButton}
          accessibilityRole="button"
          accessibilityLabel="Drag to resize bottom sheet"
        >
          <View style={styles.handle} />
        </View>

        <View style={styles.content}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    elevation: 40,
    zIndex: 40,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 19, 36, 0.12)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#00102B',
    shadowOpacity: 0.42,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    elevation: 24,
  },
  handleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    backgroundColor: 'transparent',
  },
});
