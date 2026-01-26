module.exports = {
  extends: [
    './base.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'next/core-web-vitals'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  env: {
    browser: true
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
  }
}
