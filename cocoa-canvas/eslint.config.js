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
      globals: {
        React: 'readonly',
        JSX: 'readonly',
      },
    },
  },
  js.configs.recommended,
];
