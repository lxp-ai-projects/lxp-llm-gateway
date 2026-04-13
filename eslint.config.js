const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const globals = require('globals');

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
);
