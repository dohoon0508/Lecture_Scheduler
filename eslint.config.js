import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.playwright-browsers']),
  {
    files: ['server/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    extends: [js.configs.recommended],
  },
  {
    files: ['**/*.{js,jsx}'],
    ignores: ['server/**'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
