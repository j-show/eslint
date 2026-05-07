/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const _default: DefineComponent<object, object, unknown>;
  export default _default;
}
