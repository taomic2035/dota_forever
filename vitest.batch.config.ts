import { defineConfig } from 'vitest/config';

/** 平衡批跑专用配置:npm run batchsim(默认测试套件不包含 *.manual.ts)。 */
export default defineConfig({
  test: {
    include: ['tests/**/*.manual.ts'],
    testTimeout: 600000,
    // 批跑摘要(逐局明细 + 阵营/时长聚合)直接输出终端,不被 vitest 拦截。
    disableConsoleIntercept: true,
  },
});
