// Polyfill globals needed before Expo's winter runtime loads
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

if (typeof globalThis.__ExpoImportMetaRegistry === 'undefined') {
  globalThis.__ExpoImportMetaRegistry = {};
}
