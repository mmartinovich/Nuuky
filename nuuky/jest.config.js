module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setupGlobals.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
};
