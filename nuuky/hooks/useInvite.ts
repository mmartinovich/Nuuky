import { useState, useCallback } from 'react';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import { Share, Alert, Platform } from 'react-native';
import { useAppStore } from '../stores/appStore';

export const useInvite = () => {
  const { currentUser } = useAppStore();
  const [sending, setSending] = useState(false);

  /**
   * Generate personalized invite link
   * In production, this would be a proper deep link
   */
  const getInviteLink = useCallback((): string => {
    const referralCode = currentUser?.id || 'welcome';
    // For now, use a placeholder. Replace with actual app store link later.
    return `https://nuuky.app/invite/${referralCode}`;
  }, [currentUser?.id]);

  /**
   * Generate invite message with personalization
   */
  const getInviteMessage = useCallback((contactName?: string): string => {
    const userName = currentUser?.display_name || 'A friend';
    const greeting = contactName ? `Hey ${contactName}!` : 'Hey!';

    return `${greeting} ${userName} invited you to join Nūūky!

Nūūky is a mood-based social app where you can see how your friends are feeling and connect through voice rooms.

Download now: ${getInviteLink()}`;
  }, [currentUser?.display_name, getInviteLink]);

  /**
   * Send SMS invite to a specific phone number
   * Opens the native SMS app with pre-filled message
   */
  const sendSMSInvite = useCallback(async (
    phoneNumber: string,
    contactName?: string
  ): Promise<boolean> => {
    try {
      setSending(true);

      const isAvailable = await SMS.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert(
          'SMS Not Available',
          'SMS is not available on this device. Try sharing instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share',
              onPress: () => shareInvite(contactName),
            },
          ]
        );
        return false;
      }

      const { result } = await SMS.sendSMSAsync(
        [phoneNumber],
        getInviteMessage(contactName)
      );

      // 'sent' on iOS means the message was sent
      // 'unknown' on Android (can't determine if actually sent)
      if (result === 'sent' || result === 'unknown') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('SMS invite error:', error);
      Alert.alert('Error', 'Failed to open SMS. Please try again.');
      return false;
    } finally {
      setSending(false);
    }
  }, [getInviteMessage]);

  /**
   * Open native share sheet for universal sharing
   * Works with WhatsApp, Messenger, email, etc.
   */
  const shareInvite = useCallback(async (contactName?: string): Promise<boolean> => {
    try {
      setSending(true);

      const message = getInviteMessage(contactName);

      const result = await Share.share({
        message,
        title: 'Join me on Nūūky!',
        // iOS supports URL separately
        ...(Platform.OS === 'ios' && { url: getInviteLink() }),
      });

      if (result.action === Share.sharedAction) {
        // User shared successfully (or at least opened a share target)
        return true;
      }

      return false;
    } catch (error: any) {
      // User cancelled - not an error
      if (error.message?.includes('cancel')) {
        return false;
      }

      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share invite. Please try again.');
      return false;
    } finally {
      setSending(false);
    }
  }, [getInviteMessage, getInviteLink]);

  /**
   * Open WhatsApp directly with invite message (if installed)
   */
  const sendWhatsAppInvite = useCallback(async (
    phoneNumber: string,
    contactName?: string
  ): Promise<boolean> => {
    try {
      setSending(true);

      // Format phone for WhatsApp (remove + and non-digits)
      const cleanPhone = phoneNumber.replace(/[^\d]/g, '');
      const message = encodeURIComponent(getInviteMessage(contactName));
      const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${message}`;

      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return true;
      } else {
        Alert.alert(
          'WhatsApp Not Installed',
          'WhatsApp is not installed on this device.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Use SMS', onPress: () => sendSMSInvite(phoneNumber, contactName) },
            { text: 'Share...', onPress: () => shareInvite(contactName) },
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('WhatsApp invite error:', error);
      return false;
    } finally {
      setSending(false);
    }
  }, [getInviteMessage, sendSMSInvite, shareInvite]);

  /**
   * Show action sheet with invite options
   */
  const inviteWithChoice = useCallback((
    phoneNumber: string,
    contactName?: string
  ): void => {
    Alert.alert(
      'Invite Friend',
      `How would you like to invite ${contactName || 'this contact'}?`,
      [
        {
          text: 'SMS',
          onPress: () => sendSMSInvite(phoneNumber, contactName),
        },
        {
          text: 'WhatsApp',
          onPress: () => sendWhatsAppInvite(phoneNumber, contactName),
        },
        {
          text: 'More Options...',
          onPress: () => shareInvite(contactName),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [sendSMSInvite, sendWhatsAppInvite, shareInvite]);

  return {
    sending,
    sendSMSInvite,
    shareInvite,
    sendWhatsAppInvite,
    inviteWithChoice,
    getInviteLink,
    getInviteMessage,
  };
};
