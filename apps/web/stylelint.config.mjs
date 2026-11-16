// agent-common/checks: shared stylelint config (06 rule 3: every value from tokens; Tailwind retired).
// Apps copy this to the repo root. Needs (exact pin): stylelint. Raw values may appear ONLY in token files.
/** @type {import('stylelint').Config} */
export default {
  ignoreFiles: ['dist/**', 'build/**', 'coverage/**', 'node_modules/**'],
  rules: {
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch'],
    'unit-disallowed-list': ['px'],
    'at-rule-disallowed-list': ['tailwind', 'apply'],
    'declaration-no-important': true,
    'selector-max-id': 0,
  },
  overrides: [
    // Token files are the only place raw colours and px live.
    { files: ['**/tokens/**/*.css', '**/*.tokens.css'], rules: { 'color-no-hex': null, 'color-named': null, 'function-disallowed-list': null, 'unit-disallowed-list': null } },
  ],
};
