import {
  Animated,
  Easing,
  Pressable,
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

  const snapHeights = useMemo(() => {
    if (containerHeight <= 0) {
      return detents.map(() => MIN_SHEET_HEIGHT);
    }

    const usableHeight = Math.max(
      MIN_SHEET_HEIGHT,
      containerHeight - Math.max(insets.top + 16, 48),
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

  const handleCycleDetent = useCallback(() => {
    const nextIndex = activeIndex >= detents.length - 1 ? 0 : activeIndex + 1;
    animateToIndex(nextIndex);
  }, [activeIndex, animateToIndex, detents.length]);

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

        <Pressable
          style={styles.handleButton}
          onPress={handleCycleDetent}
          accessibilityRole="button"
          accessibilityLabel="Resize bottom sheet"
        >
          <View style={styles.handle} />
        </Pressable>

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
    left: 10,
    right: 10,
    bottom: 8,
    backgroundColor: 'rgba(10, 19, 36, 0.12)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
