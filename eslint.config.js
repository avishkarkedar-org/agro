import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// lucide-react v1 removed every brand/logo icon. Importing one is not a
// warning -- it is a hard MISSING_EXPORT failure at bundle time, which the
// dev server does not surface. Keep this list in sync with the `guard` job
// in .github/workflows/e2e-tests.yml.
const LUCIDE_BRAND_ICONS = [
  'Instagram', 'Twitter', 'Facebook', 'Youtube', 'Github', 'Linkedin',
  'Slack', 'Figma', 'Chrome', 'Codepen', 'Dribbble', 'Gitlab', 'Twitch',
  'Trello', 'Airplay',
]

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    rules: {
      'react/react-in-jsx-scope': 'off',
      'no-unused-vars': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off',
      'no-empty': 'off',
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'lucide-react',
          importNames: LUCIDE_BRAND_ICONS,
          message:
            'lucide-react v1 removed brand/logo icons -- this breaks the production build. Draw the glyph inline as a local SVG component instead (see InstagramIcon in src/App.jsx).',
        }],
      }],
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
