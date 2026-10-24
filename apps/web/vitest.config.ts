import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Unit tests run against the TypeScript sources of the workspace packages, so
// `npm test` works on a fresh clone without building packages/core first.
export default defineConfig({
  resolve: {
    alias: {
      '@lfps/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      '@lfps/ui': fileURLToPath(new URL('../../packages/ui/src/index.ts', import.meta.url)),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
    __GIT_COMMIT__: JSON.stringify('test'),
    __GIT_BRANCH__: JSON.stringify('test'),
    __BUILD_TIME__: JSON.stringify('1970-01-01T00:00:00.000Z'),
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['test/setup.ts'],
  },
});
