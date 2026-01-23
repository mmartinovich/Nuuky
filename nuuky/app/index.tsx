import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppStore } from '../stores/appStore';
import { supabase } from '../lib/supabase';

export default function Index() {
  const { isAuthenticated } = useAppStore();
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
  
  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  
  // Redirect based on authentication status
  if (isAuthenticated) {
    return <Redirect href="/(main)" />;
  }
  
  return <Redirect href="/(auth)/login" />;
}
