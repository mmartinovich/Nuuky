import { logger } from './logger';
import { AppState, AppStateStatus } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

type SubscriptionCallback = () => RealtimeChannel;
type CleanupCallback = () => void;

interface ManagedSubscription {
  id: string;
  channel: RealtimeChannel | null;
  createChannel: SubscriptionCallback;
  isActive: boolean;
}

class SubscriptionManager {
  private subscriptions: Map<string, ManagedSubscription> = new Map();
  private appState: AppStateStatus = AppState.currentState;
  private isInitialized = false;
  private isPaused = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to app state changes
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    const wasInBackground = this.appState.match(/inactive|background/);
    const isNowActive = nextAppState === 'active';
    const isNowBackground = nextAppState.match(/inactive|background/);

    this.appState = nextAppState;

    if (wasInBackground && isNowActive) {
      // App came to foreground - resume subscriptions
      this.resumeAll();
    } else if (isNowBackground) {
      // App went to background - pause subscriptions
      this.pauseAll();
    }
  };

  /**
   * Register a subscription with the manager
   * @param id Unique identifier for the subscription
   * @param createChannel Function that creates and returns the RealtimeChannel
   * @returns Cleanup function to unregister the subscription
   */
  register(id: string, createChannel: SubscriptionCallback): CleanupCallback {
    // If already registered, clean up first
    if (this.subscriptions.has(id)) {
      this.unregister(id);
    }

    const subscription: ManagedSubscription = {
      id,
      channel: null,
      createChannel,
      isActive: false,
    };

    this.subscriptions.set(id, subscription);

    // Start the subscription if app is in foreground
    if (!this.isPaused) {
      this.startSubscription(subscription);
    }

    return () => this.unregister(id);
  }

  /**
   * Unregister and cleanup a subscription
   */
  unregister(id: string) {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      this.stopSubscription(subscription);
      this.subscriptions.delete(id);
    }
  }

  /**
   * Pause all subscriptions (called when app goes to background)
   */
  pauseAll() {
    if (this.isPaused) return;
    this.isPaused = true;

    this.subscriptions.forEach((subscription) => {
      this.stopSubscription(subscription);
    });
  }

  /**
   * Resume all subscriptions (called when app comes to foreground)
   */
  resumeAll() {
    if (!this.isPaused) return;
    this.isPaused = false;

    this.subscriptions.forEach((subscription) => {
      this.startSubscription(subscription);
    });
  }

  private startSubscription(subscription: ManagedSubscription) {
    if (subscription.isActive || subscription.channel) return;

    try {
      subscription.channel = subscription.createChannel();
      subscription.isActive = true;
    } catch (error) {
      logger.error(`Failed to start subscription ${subscription.id}:`, error);
    }
  }

  private stopSubscription(subscription: ManagedSubscription) {
    if (!subscription.isActive && !subscription.channel) return;

    try {
      if (subscription.channel) {
        supabase.removeChannel(subscription.channel);
        subscription.channel = null;
      }
      subscription.isActive = false;
    } catch (error) {
      logger.error(`Failed to stop subscription ${subscription.id}:`, error);
    }
  }

  /**
   * Get the current pause state
   */
  get paused() {
    return this.isPaused;
  }

  /**
   * Get count of active subscriptions
   */
  get activeCount() {
    let count = 0;
    this.subscriptions.forEach((sub) => {
      if (sub.isActive) count++;
    });
    return count;
  }

  /**
   * Cleanup all subscriptions (for logout)
   */
  cleanup() {
    this.subscriptions.forEach((subscription) => {
      this.stopSubscription(subscription);
    });
    this.subscriptions.clear();
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();
