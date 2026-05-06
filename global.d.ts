/// <reference types="vite/client" />

/**
 * Vite 注入的环境变量占位；各应用可按需通过 `interface ImportMetaEnv` 合并声明扩展键名。
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 由应用侧 augment 扩展键
interface ImportMetaEnv {}

/**
 * 与 Vite 客户端类型对齐的 `import.meta` 形状。
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
