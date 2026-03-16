const baseConfig = require('./base')

module.exports = {
  ...baseConfig,
  extends: [
    ...(baseConfig.extends || []),
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'next/core-web-vitals',
  ],
  settings: {
    ...(baseConfig.settings || {}),
    react: {
      ...(baseConfig.settings?.react || {}),
      version: 'detect',
    },
  },
  env: {
    ...(baseConfig.env || {}),
    browser: true,
  },
  rules: {
    ...(baseConfig.rules || {}),
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    // Frontend-specific relaxations to avoid blocking builds on non-critical a11y/TS issues
    'jsx-a11y/no-autofocus': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/media-has-caption': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    'jsx-a11y/interactive-supports-focus': 'off',
    '@next/next/no-img-element': 'off',
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
  },
}
