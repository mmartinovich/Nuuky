import React from 'react';
import { render, renderHook, RenderOptions } from '@testing-library/react-native';

// Simple wrapper - currently no providers needed since we use Zustand (no context)
// This can be extended to include ThemeContext or NotificationBannerContext if needed

const AllProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const renderWithStore = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: AllProviders, ...options });

export const renderHookWithStore = <T,>(hook: () => T) =>
  renderHook(hook, { wrapper: AllProviders });
