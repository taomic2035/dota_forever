import { defineConfig } from 'vitest/config';

/** 平衡批跑专用配置:npm run batchsim(默认测试套件不包含 *.manual.ts)。 */
export default defineConfig({
  test: {
    include: ['tests/**/*.manual.ts'],
    testTimeout: 600000,
  },
});
