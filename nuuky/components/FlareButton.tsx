import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { typography, spacing, radius } from '../lib/theme';
import { useTheme } from '../hooks/useTheme';

interface FlareButtonProps {
  onPress: () => void;
  loading?: boolean;
  hasActiveFlare?: boolean;
}

export const FlareButton: React.FC<FlareButtonProps> = ({
  onPress,
  loading = false,
  hasActiveFlare = false,
}) => {
  const { theme } = useTheme();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation | null = null;
    
    if (hasActiveFlare) {
      // Pulsing animation for active flare
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      pulseAnim.setValue(1);
    }

    // Cleanup on unmount
    return () => {
      pulseAnimation?.stop();
    };
  }, [hasActiveFlare]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={loading}
      accessibilityLabel={hasActiveFlare ? "Flare is active" : "Send a flare"}
      accessibilityRole="button"
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={hasActiveFlare ? ['#ef4444', '#dc2626'] : theme.gradients.button}
          style={[
            styles.button,
            hasActiveFlare && styles.activeButton,
            loading && styles.buttonDisabled,
          ]}
        >
          <View style={styles.content}>
            <Text style={styles.emoji}>{hasActiveFlare ? '🚨' : '🔥'}</Text>
            <View>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                {hasActiveFlare ? 'Flare Active' : 'Send Flare'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                {hasActiveFlare ? 'Help is on the way' : 'Need support?'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeButton: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    fontSize: typography.size.sm,
  },
});
