const nextPlugin = require('@next/eslint-plugin');
const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['coverage', '.next', 'node_modules', '.swc', 'dist'],
  },
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.rules,
      '@next/next/no-img-element': 'off',
    },
  },
  js.configs.recommended,
];
