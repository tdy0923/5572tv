import nextVitals from 'eslint-config-next/core-web-vitals';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  {
    ignores: [
      'public/sw.js',
      'public/workbox-*.js',
      'public/*.min.js',
      'node_modules/**',
      '.next/**',
      // CJS 工具/配置文件，用 app 规则 lint 会因 require/未注册规则报错
      'jest.config.js',
      'jest.setup.js',
      'next.config.js',
      'scripts/**',
    ],
  },
  ...nextVitals,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // 代理图片必须用 <img>（next/image 无法 fetch 内部代理路由，见 scripts/check-no-next-image-for-proxy.js）
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'react/jsx-curly-brace-presence': [
        'warn',
        { props: 'never', children: 'never' },
      ],
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      'simple-import-sort/exports': 'warn',
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            ['^@?\\w', '^\\u0000'],
            ['^.+\\.s?css$'],
            ['^@/lib', '^@/hooks'],
            ['^@/data'],
            ['^@/components', '^@/container'],
            ['^@/store'],
            ['^@/'],
            [
              '^\\./?$',
              '^\\.(?!/?$)',
              '^\\.\\./?$',
              '^\\.\\.(?!/?$)',
              '^\\.\\./\\.\\./?$',
              '^\\.\\./\\.\\.(?!/?$)',
              '^\\.\\./\\.\\./\\.\\./?$',
              '^\\.\\./\\.\\./\\.\\.(?!/?$)',
            ],
            ['^@/types'],
            ['^'],
          ],
        },
      ],
    },
  },
  // Fluent2：核心组件禁止硬编码色号，走 @/lib/fluent-alias 语义层
  // （其余 Fluent* 家族迁移中，暂不限；全仓禁 hex 会误伤 glass 渐变等合法场景）
  {
    files: [
      'src/components/FluentButton.tsx',
      'src/components/FluentCard.tsx',
      'src/components/FluentModal.tsx',
      'src/components/FluentInput.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]',
          message:
            'Fluent 核心组件禁止硬编码色号，请使用 @/lib/fluent-alias 语义层或主题色（primary-*/gray-*/red-500 等）。',
        },
      ],
    },
  },
];
