import viteVue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * Vue 示例的最小 Vite 配置，仅启用 `@vitejs/plugin-vue`。
 */
export default defineConfig({
  plugins: [viteVue()]
});
