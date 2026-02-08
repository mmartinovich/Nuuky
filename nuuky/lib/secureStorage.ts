import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

// Plain AsyncStorage adapter — persisted data is non-sensitive.
// Stored: theme preference, room IDs, lo-fi settings, favorite friend IDs,
// and public user profile (display name, avatar URL, mood). No auth tokens
// or passwords are stored here — Supabase manages auth credentials securely.
export const encryptedStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};
