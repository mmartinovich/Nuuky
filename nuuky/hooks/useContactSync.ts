import { useState, useCallback } from 'react';
import * as Contacts from 'expo-contacts';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { PhoneContact, MatchedContact } from '../types';

interface ContactSyncResult {
  onNuuky: MatchedContact[];
  notOnNuuky: PhoneContact[];
}

export const useContactSync = () => {
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [matches, setMatches] = useState<ContactSyncResult>({
    onNuuky: [],
    notOnNuuky: [],
  });

  /**
   * Normalize phone number to E.164 format for consistent matching
   */
  const normalizePhone = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // Handle common formats
    if (digits.length === 10) {
      // US number without country code - assume +1
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US number with leading 1
      return `+${digits}`;
    } else if (digits.length > 10) {
      // International number
      return `+${digits}`;
    }

    // Return with + prefix if we have at least 10 digits
    return digits.length >= 10 ? `+${digits}` : '';
  };

  /**
   * Request contacts permission from the user
   */
  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);

      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please allow contacts access in Settings to find your friends on Nūūky.',
          [{ text: 'OK' }]
        );
      }

      return granted;
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return false;
    }
  };

  /**
   * Check current permission status without requesting
   */
  const checkPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error checking contacts permission:', error);
      return false;
    }
  };

  /**
   * Sync contacts from phone and match against Nūūky users
   */
  const syncContacts = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      // Check/request permission
      let granted = await checkPermission();
      if (!granted) {
        granted = await requestPermission();
        if (!granted) {
          setLoading(false);
          return;
        }
      }

      // Fetch contacts from device
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (!data || data.length === 0) {
        Alert.alert('No Contacts', 'No contacts found on your device.');
        setLoading(false);
        return;
      }

      // Extract and normalize phone numbers
      const contactMap = new Map<string, PhoneContact>();
      const allPhones: string[] = [];

      data.forEach((contact) => {
        if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) return;

        const phoneNumbers: string[] = [];

        contact.phoneNumbers.forEach((phoneObj) => {
          const normalized = normalizePhone(phoneObj.number || '');
          if (normalized && normalized.length >= 10) {
            phoneNumbers.push(normalized);
            allPhones.push(normalized);
          }
        });

        if (phoneNumbers.length > 0) {
          // Use first phone as key, store contact once
          const primaryPhone = phoneNumbers[0];
          if (!contactMap.has(primaryPhone)) {
            contactMap.set(primaryPhone, {
              id: contact.id || primaryPhone,
              name: contact.name || 'Unknown',
              phoneNumbers,
            });
          }
        }
      });

      if (allPhones.length === 0) {
        Alert.alert('No Phone Numbers', 'No valid phone numbers found in your contacts.');
        setLoading(false);
        return;
      }

      // Query Supabase to find registered users
      // Batch in chunks to avoid query size limits
      const batchSize = 100;
      const registeredUsers: Array<{ phone: string; id: string; display_name: string; avatar_url?: string }> = [];

      for (let i = 0; i < allPhones.length; i += batchSize) {
        const batch = allPhones.slice(i, i + batchSize);
        const { data: users, error } = await supabase
          .from('users')
          .select('phone, id, display_name, avatar_url')
          .in('phone', batch);

        if (error) {
          console.error('Error querying users:', error);
          continue;
        }

        if (users) {
          registeredUsers.push(...users);
        }
      }

      // Create a set of registered phone numbers for quick lookup
      const registeredPhoneSet = new Set(registeredUsers.map((u) => u.phone));

      // Create a map for user details lookup
      const userDetailsMap = new Map(
        registeredUsers.map((u) => [u.phone, u])
      );

      // Split contacts into two groups
      const onNuuky: MatchedContact[] = [];
      const notOnNuuky: PhoneContact[] = [];

      contactMap.forEach((contact) => {
        // Check if any of the contact's phone numbers are registered
        const matchedPhone = contact.phoneNumbers.find((p) => registeredPhoneSet.has(p));

        if (matchedPhone) {
          const userDetails = userDetailsMap.get(matchedPhone);
          onNuuky.push({
            ...contact,
            userId: userDetails?.id,
            displayName: userDetails?.display_name,
            avatarUrl: userDetails?.avatar_url,
          });
        } else {
          notOnNuuky.push(contact);
        }
      });

      // Sort: onNuuky by name, notOnNuuky by name
      onNuuky.sort((a, b) => a.name.localeCompare(b.name));
      notOnNuuky.sort((a, b) => a.name.localeCompare(b.name));

      setMatches({ onNuuky, notOnNuuky });
      setHasSynced(true);

      // Show results summary
      Alert.alert(
        'Contacts Synced',
        `Found ${onNuuky.length} friend${onNuuky.length !== 1 ? 's' : ''} on Nūūky and ${notOnNuuky.length} to invite.`
      );
    } catch (error: any) {
      console.error('Error syncing contacts:', error);
      Alert.alert('Error', 'Failed to sync contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear synced contacts (useful for refresh)
   */
  const clearMatches = useCallback(() => {
    setMatches({ onNuuky: [], notOnNuuky: [] });
    setHasSynced(false);
  }, []);

  return {
    loading,
    hasPermission,
    hasSynced,
    matches,
    requestPermission,
    checkPermission,
    syncContacts,
    clearMatches,
  };
};
