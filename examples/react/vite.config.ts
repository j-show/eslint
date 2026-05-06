import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * React 示例的最小 Vite 配置，仅启用 `@vitejs/plugin-react`。
 */
export default defineConfig({
  plugins: [viteReact()]
});
