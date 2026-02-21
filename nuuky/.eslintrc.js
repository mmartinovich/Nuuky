module.exports = {
  root: true,
  extends: ["expo", "plugin:react-hooks/recommended"],
  plugins: ["react-hooks"],
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": ["warn", { allow: ["error"] }],
  },
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "ios/",
    "android/",
    ".expo/",
    "supabase/functions/",
    "__tests__/",
  ],
};
