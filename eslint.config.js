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
  {
    files: ['services/api/**/*.ts'],
    rules: {
      // Expo client restrictions do not apply to the standalone Node.js API.
      'expo/no-dynamic-env-var': 'off',
      // Preserve the API's existing collection type convention.
      '@typescript-eslint/array-type': 'off',
    },
  },
]);
