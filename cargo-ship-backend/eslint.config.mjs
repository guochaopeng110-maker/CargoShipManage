// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist', 'coverage', 'node_modules'],
  },
  // 1. 针对所有 .js 文件的配置 (不包括 src 目录下的 .js 文件和 eslint.config.mjs 自身)
  {
    files: ['**/*.js'],
    // 排除 src 目录下的 .js 文件，因为它们应该由 TypeScript 配置处理（如果 tsconfig 允许的话）
    // 也排除 eslint.config.mjs 自身，因为它是一个 ESM 文件
    excludedFiles: ['src/**/*.js', 'eslint.config.mjs'],
    extends: [
      eslint.configs.recommended, // 标准 JavaScript 推荐规则
      eslintPluginPrettierRecommended, // Prettier 格式化规则
    ],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest', // 支持最新的 ECMAScript 语法
        sourceType: 'commonjs', // 明确指定为 CommonJS 模块
      },
      globals: {
        ...globals.node, // Node.js 全局变量
      },
    },
    rules: {
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
      // 禁用 @typescript-eslint 相关的 require 规则，确保 CommonJS 语法不会报错
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  // 2. 针对所有 .ts 和 .tsx 文件的配置 (包括 src 目录下的 TypeScript 文件)
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      eslint.configs.recommended, // 标准 JavaScript 推荐规则
      ...tseslint.configs.recommendedTypeChecked, // TypeScript 推荐规则和类型检查规则
      eslintPluginPrettierRecommended, // Prettier 格式化规则
    ],
    languageOptions: {
      parser: tseslint.parser, // 指定 TypeScript 解析器
      parserOptions: {
        project: true, // 启用项目感知，需要 tsconfig.json
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module', // TypeScript 文件通常使用 ES modules
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // 现有的 TypeScript 规则
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  // 3. 针对 eslint.config.mjs 文件自身的配置 (因为它是一个 ES Module)
  {
    files: ['eslint.config.mjs'],
    languageOptions: {
      parserOptions: {
        sourceType: 'module', // 明确指定为 ES Module
      },
      globals: {
        ...globals.node,
      },
    },
  },
);
