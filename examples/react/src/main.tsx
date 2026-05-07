/**
 * React 示例入口：在 `#root` 上创建并发根，启用 `StrictMode`。
 *
 * 对 `root` 的空值判断避免在缺失 DOM 节点时抛错，便于在非浏览器环境中间接 import 本文件。
 * import 分组与顺序由 `jshow/sort-import` 与 React 预设约束，勿凭直觉手工调整。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles.css';

import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
