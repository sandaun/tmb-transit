// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Expo managed projects with TS path aliases and RN package exports can trigger false positives.
      'import/no-unresolved': 'off',
    },
  },
]);
