// agent-common/checks: shared ESLint flat config (06 rules 2, 3, 4, 7, STYLE_GUIDE banned habits).
// Apps copy this file to the repo root as eslint.config.mjs and note the agent-common commit at the top.
// Needs (exact pins): eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Local rule: every to-do marker must carry an ID, e.g. TODO(FEAT-123). (STYLE_GUIDE banned habit)
const todoNeedsId = {
  meta: { type: 'problem', messages: { noId: 'TODO/FIXME needs an ID, e.g. TODO(FEAT-123): why.' }, schema: [] },
  create(context) {
    return {
      Program() {
        for (const c of context.sourceCode.getAllComments()) {
          const words = c.value.match(/\b(TODO|FIXME|XXX)\b(\([A-Z][A-Z0-9]*-\d+\))?/g) ?? [];
          if (words.some((w) => !/\([A-Z][A-Z0-9]*-\d+\)$/.test(w))) context.report({ loc: c.loc, messageId: 'noId' });
        }
      },
    };
  },
};

// Motion numbers live in the motion tokens only (06 rule 3, STYLE_GUIDE "inline springs").
const SPRING_KEYS = '/^(stiffness|damping|mass|bounce|velocity|restDelta|restSpeed|visualDuration)$/';
const TIME_KEYS = '/^(duration|delay|repeatDelay|staggerChildren|delayChildren)$/';
const MOTION_PROPS = '/^(transition|animate|initial|exit|whileTap|whileHover|whileInView|whileDrag|variants)$/';

export default tseslint.config(
  { ignores: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    plugins: { 'react-hooks': reactHooks, local: { rules: { 'todo-needs-id': todoNeedsId } } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
      'local/todo-needs-id': 'error',
      'max-lines-per-function': ['warn', { max: 40, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 3],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-restricted-imports': ['error', { paths: [
        { name: 'tailwindcss', message: 'Tailwind is retired (agent-common adr/ADR-0001-styling.md).' },
        { name: 'motion', message: 'Use framer-motion (pinned) through motion/ only, until the planned motion upgrade ADR.' },
        { name: 'motion/react', message: 'Use framer-motion (pinned) through motion/ only, until the planned motion upgrade ADR.' },
      ] }],
      'no-restricted-syntax': ['error',
        { selector: 'CatchClause > BlockStatement[body.length=0]', message: 'Silent catch: handle, rethrow or report the error.' },
        { selector: `Property[key.name=${SPRING_KEYS}] > Literal`, message: 'Spring numbers come from the motion tokens (motion/), never inline.' },
        { selector: `JSXAttribute[name.name=${MOTION_PROPS}] Property[key.name=${TIME_KEYS}] > Literal`, message: 'Motion timings come from the motion tokens (motion/), never inline.' },
        { selector: `JSXAttribute[name.name=${MOTION_PROPS}] Property[key.name='ease'] > Literal`, message: 'Easing comes from the motion tokens.' },
      ],
    },
  },
  // UI, store and motion never touch network or storage directly (06 rule 1); only data/ adapters do.
  {
    files: ['src/ui/**', 'src/store/**', 'src/motion/**'],
    rules: {
      'no-restricted-globals': ['error',
        ...['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'caches']
          .map((name) => ({ name, message: 'Only data/ adapters use network or storage; screens go through the store.' })),
      ],
    },
  },
  // Token files are the one place motion numbers may be written.
  { files: ['src/tokens/**', 'src/motion/tokens.ts'], rules: { 'no-restricted-syntax': 'off' } },
  // Tests may be long and use literal data.
  { files: ['**/*.test.ts', '**/*.test.tsx'], rules: { 'max-lines-per-function': 'off' } },
  // Node scripts (checks, token build): Node globals, no type-aware rules.
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { process: 'readonly', console: 'readonly', module: 'writable', require: 'readonly', __dirname: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
