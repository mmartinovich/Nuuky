import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../stores/appStore';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '../../hooks/useTheme';
import { colors, gradients, typography, spacing, radius, interactionStates } from '../../lib/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { currentUser } = useAppStore();
  const { loading, pickAndUploadAvatar, updateDisplayName, completeProfile } = useProfile();

  const [displayName, setDisplayName] = useState(
    currentUser?.display_name || ''
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(
    currentUser?.avatar_url || null
  );

  // Pulse animation for avatar glow
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Update avatar URI when currentUser changes
    if (currentUser?.avatar_url) {
      setAvatarUri(currentUser.avatar_url);
    }

    return () => {
      pulseAnimation.stop();
    };
  }, [currentUser?.avatar_url]);

  const handleAvatarPress = () => {
    if (Platform.OS === 'ios') {
      const options = avatarUri
        ? ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel']
        : ['Take Photo', 'Choose from Library', 'Cancel'];
      const destructiveButtonIndex = avatarUri ? 2 : undefined;
      const cancelButtonIndex = avatarUri ? 3 : 2;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          destructiveButtonIndex,
          title: 'Profile Picture',
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            await pickAndUploadAvatar('camera');
            // Avatar will be updated via useEffect when currentUser changes
          } else if (buttonIndex === 1) {
            await pickAndUploadAvatar('gallery');
            // Avatar will be updated via useEffect when currentUser changes
          } else if (buttonIndex === 2 && avatarUri) {
            setAvatarUri(null);
            // Note: We don't call deleteAvatar here since user might skip
          }
        }
      );
    } else {
      // Android fallback
      const buttons = [
        { text: 'Take Photo', onPress: async () => {
          await pickAndUploadAvatar('camera');
          // Avatar will be updated via useEffect when currentUser changes
        }},
        { text: 'Choose from Library', onPress: async () => {
          await pickAndUploadAvatar('gallery');
          // Avatar will be updated via useEffect when currentUser changes
        }},
      ];
      
      if (avatarUri) {
        buttons.push({
          text: 'Remove Photo',
          onPress: () => setAvatarUri(null),
        });
      }
      
      buttons.push({ text: 'Cancel', onPress: () => {}, style: 'cancel' as const });

      Alert.alert('Profile Picture', 'Choose an option', buttons);
    }
  };

  const handleContinue = async () => {
    const trimmedName = displayName.trim();
    
    if (trimmedName.length < 1) {
      Alert.alert('Name Required', 'Please enter a display name');
      return;
    }

    if (trimmedName.length > 50) {
      Alert.alert('Name Too Long', 'Display name must be 50 characters or less');
      return;
    }

    // Update display name if it changed
    if (trimmedName !== currentUser?.display_name) {
      const success = await updateDisplayName(trimmedName);
      if (!success) {
        return; // Error already shown in hook
      }
    }

    // Mark profile as completed
    const completed = await completeProfile();
    if (completed) {
      router.replace('/(main)');
    }
  };

  const isValid = displayName.trim().length >= 1 && displayName.trim().length <= 50;

  return (
    <LinearGradient colors={theme.gradients.background as any} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnim,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text.primary }]}>
                Choose Your{'\n'}Cosmic Identity
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
                Personalize your profile to enter your orbit
              </Text>
            </View>

            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={handleAvatarPress}
                disabled={loading}
                activeOpacity={interactionStates.pressed}
                style={styles.avatarButton}
              >
                <Animated.View
                  style={[
                    styles.orbGlow,
                    {
                      transform: [{ scale: pulseAnim }],
                      backgroundColor: avatarUri
                        ? 'transparent'
                        : theme.colors.mood.reachOut.glow,
                    },
                  ]}
                />
                <View style={styles.avatarContainer}>
                  {avatarUri ? (
                    <>
                      <Image source={{ uri: avatarUri }} style={styles.avatar} />
                      <View
                        style={[
                          styles.avatarBorder,
                          { borderColor: theme.colors.mood.reachOut.base },
                        ]}
                      />
                    </>
                  ) : (
                    <LinearGradient
                      colors={theme.gradients.neonPurple as any}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarInitial}>
                        {displayName.trim()[0]?.toUpperCase() || '?'}
                      </Text>
                    </LinearGradient>
                  )}
                  
                  {/* Camera overlay */}
                  <BlurView
                    intensity={80}
                    tint={theme.colors.blurTint}
                    style={styles.cameraOverlay}
                  >
                    <Feather name="camera" size={20} color={theme.colors.text.primary} />
                  </BlurView>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleAvatarPress}
                disabled={loading}
                style={styles.skipAvatarButton}
              >
                <Text style={[styles.skipAvatarText, { color: theme.colors.text.tertiary }]}>
                  {avatarUri ? 'Change Photo' : 'Add Photo (Optional)'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Name Input Section */}
            <BlurView
              intensity={20}
              tint={theme.colors.blurTint}
              style={[styles.nameCard, { borderColor: theme.colors.glass.border }]}
            >
              <Text style={[styles.label, { color: theme.colors.text.secondary }]}>
                DISPLAY NAME
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.colors.text.primary,
                    borderColor: theme.colors.glass.border,
                    backgroundColor: theme.colors.glass.background,
                  },
                ]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your display name"
                placeholderTextColor={theme.colors.text.tertiary}
                maxLength={50}
                autoFocus
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text style={[styles.charCount, { color: theme.colors.text.tertiary }]}>
                {displayName.length}/50
              </Text>
            </BlurView>

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handleContinue}
              disabled={loading || !isValid}
              style={styles.continueButton}
              activeOpacity={interactionStates.pressed}
            >
              <LinearGradient
                colors={
                  isValid
                    ? (theme.gradients.neonCyan as any)
                    : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']
                }
                style={[
                  styles.continueGradient,
                  (!isValid || loading) && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.continueButtonText}>
                  {loading ? 'Setting up...' : 'Enter Your Orbit'}
                </Text>
                <Feather
                  name="arrow-right"
                  size={20}
                  color={isValid ? '#fff' : theme.colors.text.tertiary}
                  style={styles.arrowIcon}
                />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Subtle grain texture overlay */}
        <View style={styles.grain} pointerEvents="none" />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.screenPadding, // Updated: spacing.xl → screenPadding (24px)
    justifyContent: 'center',
  },
  animatedContainer: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    fontSize: typography.size['4xl'],
    fontWeight: typography.weight.bold as any,
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -1,
    lineHeight: 48,
  },
  subtitle: {
    fontSize: typography.size.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  avatarButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.6,
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBorder: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  avatarInitial: {
    fontSize: typography.size['5xl'],
    fontWeight: typography.weight.bold as any,
    color: '#fff',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipAvatarButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  skipAvatarText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium as any,
  },
  nameCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold as any,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  input: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.medium as any,
    padding: spacing.md, // 20px
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xs,
    minHeight: 56, // Updated: ensure proper touch target
  },
  charCount: {
    fontSize: typography.size.xs,
    textAlign: 'right',
  },
  continueButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  continueGradient: {
    padding: spacing.md, // Updated: 20px for better proportions
    minHeight: 56, // Updated: ensure proper button height
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold as any,
    color: '#fff',
  },
  arrowIcon: {
    marginLeft: spacing.sm,
  },
  grain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    opacity: 0.5,
  },
});
