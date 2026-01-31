import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, typography } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function ThemedErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const { theme } = useTheme();

  return (
    <LinearGradient colors={theme.gradients.background} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.colors.mood.notGreat.base} />
        </View>

        <Text style={[styles.title, { color: theme.colors.text.primary }]}>Something went wrong</Text>
        <Text style={[styles.message, { color: theme.colors.text.secondary }]}>
          We encountered an unexpected error. Please try again.
        </Text>

        {__DEV__ && error && (
          <View style={[styles.errorDetails, { backgroundColor: theme.colors.glass.background, borderColor: theme.colors.glass.border }]}>
            <Text style={[styles.errorText, { color: theme.colors.mood.notGreat.base }]}>
              {error.message}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onRetry}
          style={styles.retryButton}
          activeOpacity={0.8}
          accessibilityLabel="Retry"
          accessibilityRole="button"
          accessibilityHint="Attempts to recover from the error"
        >
          <LinearGradient
            colors={theme.gradients.button}
            style={styles.retryGradient}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.text.primary} />
            <Text style={[styles.retryText, { color: theme.colors.text.primary }]}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ThemedErrorFallback error={this.state.error} onRetry={this.handleRetry} />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.9,
  },
  title: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold as any,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.size.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  errorDetails: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    width: '100%',
  },
  errorText: {
    fontSize: typography.size.sm,
    fontFamily: 'monospace',
  },
  retryButton: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  retryText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold as any,
  },
});

export default ErrorBoundary;
