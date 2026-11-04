// The stress run (ADR 0016) is kept apart from `npm test`: it needs the real screenshots,
// which only exist on the developer's machine.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['stress/**/*.check.ts'], environment: 'jsdom', testTimeout: 60_000 },
});
