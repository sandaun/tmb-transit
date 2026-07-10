import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppLanguage } from '@/src/i18n';
import { Text, type Palette, useThemedStyles } from '@/src/design-system';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render/lifecycle errors from the tree below so a single component
 * throw shows a recoverable screen instead of a blank/crashed app. "Try again"
 * remounts the subtree by clearing the error state.
 */
class ErrorBoundaryContent extends Component<ErrorBoundaryProps & { title: string; body: string; retry: string; styles: ReturnType<typeof createStyles> }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.error('Unhandled UI error:', error, info.componentStack);
    }
  }

  private readonly handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { styles } = this.props;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{this.props.title}</Text>
        <Text style={styles.body}>{this.props.body}</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={this.handleReset}>
          <Text style={styles.buttonText}>{this.props.retry}</Text>
        </Pressable>
      </View>
    );
  }
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  const { t } = useAppLanguage();
  const styles = useThemedStyles(createStyles);
  return (
    <ErrorBoundaryContent title={t('error_title')} body={t('error_body')} retry={t('retry')} styles={styles}>
      {children}
    </ErrorBoundaryContent>
  );
}

const createStyles = (palette: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
    backgroundColor: palette.background,
  },
  title: {
    color: palette.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: palette.textMuted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  buttonText: {
    color: palette.onAccent,
    fontSize: 15,
    fontWeight: '800',
  },
});
