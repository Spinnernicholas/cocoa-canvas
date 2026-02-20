import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'tmp/**', 'dist/**'],
  },
  ...nextVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
];

export default config;
