/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_WS_DEBUG: string  // WebSocket 调试模式开关（'true' 或 'false'）
  // 更多环境变量...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// SVG 模块声明
declare module '*.svg?react' {
  import { FC, SVGProps } from 'react';
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}