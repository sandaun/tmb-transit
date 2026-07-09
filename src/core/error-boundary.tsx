import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppLanguage } from '@/src/i18n';

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
class ErrorBoundaryContent extends Component<ErrorBoundaryProps & { title: string; body: string; retry: string }, ErrorBoundaryState> {
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
  return (
    <ErrorBoundaryContent title={t('error_title')} body={t('error_body')} retry={t('retry')}>
      {children}
    </ErrorBoundaryContent>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
    backgroundColor: '#09111E',
  },
  title: {
    color: '#F4F8FF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: '#AABBDC',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2A70FF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
