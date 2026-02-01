import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SettingsRow } from '../../components/ui/SettingsRow';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ isDark: true }),
}));

describe('SettingsRow', () => {
  test('renders label', () => {
    const { getByText } = render(
      <SettingsRow label="Notifications" type="toggle" />
    );
    expect(getByText('Notifications')).toBeTruthy();
  });

  test('toggle type renders switch', () => {
    const onChange = jest.fn();
    const { toJSON } = render(
      <SettingsRow label="Test" type="toggle" value={true} onChange={onChange} />
    );
    expect(toJSON()).toBeTruthy();
  });

  test('navigation type calls onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SettingsRow label="Profile" type="navigation" onPress={onPress} />
    );
    fireEvent.press(getByText('Profile'));
    expect(onPress).toHaveBeenCalled();
  });

  test('disabled navigation does not call onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SettingsRow label="Profile" type="navigation" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Profile'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
