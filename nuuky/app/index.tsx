import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppStore } from '../stores/appStore';
import { supabase } from '../lib/supabase';
import { useTheme } from '../hooks/useTheme';

export default function Index() {
  const { isAuthenticated, currentUser } = useAppStore();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Wait a moment for the auth state to be checked
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Give the auth state time to update
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    };
    
    checkAuth();
  }, []);
  
  // Match splash screen background to avoid white flash
  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: '#050510' }} />;
  }
  
  // Redirect based on authentication status and profile completion
  if (isAuthenticated) {
    // Check if user has completed onboarding
    if (currentUser && currentUser.profile_completed === false) {
      return <Redirect href="/(auth)/onboarding" />;
    }
    return <Redirect href="/(main)" />;
  }
  
  return <Redirect href="/(auth)/login" />;
}
