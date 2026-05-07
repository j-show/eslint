/**
 * Vue 示例入口：挂载根组件到 `#root`。
 *
 * import 顺序受 `jshow/sort-import` 与 Vue 预设分组约束，修改后请运行 ESLint 校验。
 */
import { createApp } from 'vue';

import './styles.css';

import App from './App.vue';

createApp(App).mount('#root');
