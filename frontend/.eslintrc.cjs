module.exports = {
  env: {
    browser: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react/jsx-runtime'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/prop-types': 'off',
  },
};
