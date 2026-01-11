import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../lib/supabase';
import { useAppStore } from '../../stores/appStore';
import { colors, gradients, typography, spacing, radius } from '../../lib/theme';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDevLogin, setShowDevLogin] = useState(false);
  const router = useRouter();
  const { setCurrentUser } = useAppStore();

  // Subtle pulse animation for the orb
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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

    // Cleanup on unmount
    return () => {
      pulseAnimation.stop();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();

    let { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!userData && user) {
      // Create profile for OAuth user (fallback if trigger doesn't work)
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email!,
          display_name: user.user_metadata?.full_name ||
                        user.user_metadata?.name ||
                        user.email?.split('@')[0] ||
                        'User',
          avatar_url: user.user_metadata?.avatar_url ||
                      user.user_metadata?.picture,
          auth_provider: user.app_metadata?.provider || 'google',
          is_online: true,
        })
        .select()
        .single();
      userData = newUser;
    }

    if (userData) {
      setCurrentUser(userData);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Not Available', 'Sign in with Apple is not available on this device.');
        return;
      }

      // Generate nonce for security
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Crypto.getRandomBytes(32).toString()
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken!,
        nonce,
      });

      if (error) throw error;

      // Fetch or create user profile
      await fetchUserProfile(data.user.id);
      router.replace('/(main)');
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled the sign-in
        return;
      }
      console.error('Apple Sign-In Error:', error);
      Alert.alert('Sign In Failed', error.message || 'Failed to sign in with Apple');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'nooke://auth/callback',
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;

      // Note: The actual session will be handled by the OAuth callback
      // which is set up in your app configuration
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      Alert.alert('Sign In Failed', error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter an email address');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Password Required', 'Please enter a password');
      return;
    }

    setLoading(true);
    try {
      // Try to sign in with password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        // If user doesn't exist, create them
        if (error.message.includes('Invalid login credentials')) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
              emailRedirectTo: undefined,
              data: {
                display_name: email.split('@')[0],
              },
            },
          });

          if (signUpError) {
            // Check if it's the email confirmation error
            if (signUpError.message.includes('Database error')) {
              Alert.alert(
                'Setup Required',
                'Please disable email confirmation in Supabase:\n\n' +
                '1. Go to Authentication → Settings\n' +
                '2. Disable "Confirm email"\n' +
                '3. Save and try again\n\n' +
                'See configure-dev-auth.md for details',
                [{ text: 'OK' }]
              );
              return;
            }
            throw signUpError;
          }

          // Check if user was created successfully
          if (signUpData.user && !signUpData.session) {
            Alert.alert(
              'Email Confirmation Required',
              'Email confirmation is enabled. Please check configure-dev-auth.md to disable it for dev mode.',
              [{ text: 'OK' }]
            );
            return;
          }

          if (signUpData.user) {
            await fetchUserProfile(signUpData.user.id);
            Alert.alert('Success', 'Account created and logged in!');
            router.replace('/(main)');
            return;
          }
        }
        throw error;
      }

      if (data.user) {
        await fetchUserProfile(data.user.id);
        router.replace('/(main)');
      }
    } catch (error: any) {
      console.error('Dev Login Error:', error);
      Alert.alert(
        'Sign In Failed',
        error.message || 'Failed to sign in. Check configure-dev-auth.md for setup instructions.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDevLogin = async () => {
    setLoading(true);
    try {
      const testEmail = 'dev@nooke.app';
      const testPassword = 'devpass123';

      // Try to sign in
      let { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      // If user doesn't exist, create them
      if (error?.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: testEmail,
          password: testPassword,
          options: {
            emailRedirectTo: undefined,
            data: {
              display_name: 'Dev User',
            },
          },
        });

        if (signUpError) {
          // Check if it's the email confirmation error
          if (signUpError.message.includes('Database error')) {
            Alert.alert(
              'Setup Required',
              'Please disable email confirmation in Supabase:\n\n' +
              '1. Go to Authentication → Settings\n' +
              '2. Disable "Confirm email"\n' +
              '3. Save and try again\n\n' +
              'See configure-dev-auth.md for details',
              [{ text: 'OK' }]
            );
            return;
          }
          throw signUpError;
        }

        // Check if user was created successfully
        if (signUpData.user && !signUpData.session) {
          Alert.alert(
            'Email Confirmation Required',
            'Email confirmation is enabled. Please check configure-dev-auth.md to disable it for dev mode.',
            [{ text: 'OK' }]
          );
          return;
        }

        data = signUpData;
      } else if (error) {
        throw error;
      }

      if (data.user) {
        await fetchUserProfile(data.user.id);
        router.replace('/(main)');
      }
    } catch (error: any) {
      console.error('Quick Dev Login Error:', error);
      Alert.alert(
        'Sign In Failed',
        error.message || 'Failed to sign in. Check configure-dev-auth.md for setup instructions.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradients.background} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Decorative orb with glow */}
          <View style={styles.orbContainer}>
            <Animated.View
              style={[
                styles.orbGlow,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <View style={styles.orb} />
          </View>

          {/* Title */}
          <View style={styles.header}>
            <Text style={styles.title}>Nūūky</Text>
            <Text style={styles.subtitle}>
              Feel connected without{'\n'}the pressure of communicating
            </Text>
          </View>

          {/* OAuth Buttons */}
          <View style={styles.authButtons}>
            {/* Apple Sign-In - Temporarily disabled until Apple Developer enrollment is complete */}
            {/* Uncomment this section once you have your personal Apple Developer account set up */}
            {/* {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={parseInt(radius.lg)}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            )} */}

            {/* Google Sign-In */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={styles.googleButtonContainer}
            >
              <View style={[styles.googleButton, loading && styles.buttonDisabled]}>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>
                  {loading ? 'Signing in...' : 'Continue with Google'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Development Login Toggle */}
            <TouchableOpacity
              onPress={() => setShowDevLogin(!showDevLogin)}
              style={styles.devToggle}
            >
              <Text style={styles.devToggleText}>
                {showDevLogin ? '− Hide Dev Login' : '+ Dev Login (Testing)'}
              </Text>
            </TouchableOpacity>

            {/* Development Email Login */}
            {showDevLogin && (
              <View style={styles.devLoginContainer}>
                {/* Quick Login Button */}
                <TouchableOpacity
                  onPress={handleQuickDevLogin}
                  disabled={loading}
                  style={[styles.quickLoginButton, loading && styles.buttonDisabled]}
                >
                  <Text style={styles.quickLoginButtonText}>
                    {loading ? 'Logging in...' : '⚡ Quick Dev Login'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or use custom account</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Text style={styles.devLoginLabel}>Email</Text>
                <TextInput
                  style={styles.devInput}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.text.tertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <Text style={styles.devLoginLabel}>Password</Text>
                <TextInput
                  style={styles.devInput}
                  placeholder="password (auto-creates if new)"
                  placeholderTextColor={colors.text.tertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <TouchableOpacity
                  onPress={handleDevLogin}
                  disabled={loading}
                  style={[styles.devLoginButton, loading && styles.buttonDisabled]}
                >
                  <Text style={styles.devLoginButtonText}>
                    {loading ? 'Signing in...' : 'Sign In / Sign Up'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.privacyText}>
            By continuing, you agree to our terms and privacy policy
          </Text>
        </View>

        {/* Subtle grain texture overlay */}
        <View style={styles.grain} pointerEvents="none" />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  orbContainer: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  orb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.mood.reachOut.base,
  },
  orbGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.mood.reachOut.glow,
    opacity: 0.6,
  },
  header: {
    marginBottom: spacing['2xl'],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.size['5xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  authButtons: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  googleButtonContainer: {
    width: '100%',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: parseInt(radius.lg),
    height: 56,
    borderWidth: 1,
    borderColor: colors.ui.border,
    gap: spacing.sm,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: typography.weight.bold,
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: '#000000',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  devToggle: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  devToggleText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  devLoginContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: parseInt(radius.lg),
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  devLoginLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    fontWeight: typography.weight.medium,
  },
  devInput: {
    backgroundColor: colors.ui.background,
    borderRadius: parseInt(radius.md),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.ui.border,
    marginBottom: spacing.md,
  },
  devLoginButton: {
    backgroundColor: colors.mood.reachOut.base,
    borderRadius: parseInt(radius.md),
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  devLoginButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: '#FFFFFF',
  },
  quickLoginButton: {
    backgroundColor: '#00D9FF',
    borderRadius: parseInt(radius.md),
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  quickLoginButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
    color: '#000000',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.ui.border,
  },
  dividerText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginHorizontal: spacing.sm,
  },
  privacyText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
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
