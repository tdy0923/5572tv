/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Tailwind 4 使用 CSS @theme 和 @custom-variant 定义主题
  // 大部分配置已迁移到 src/app/globals.css
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
        '4k': '2560px',
        '8k': '3840px',
      },
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      maxWidth: {
        '8k': '85rem', // 1360px base, scales with fluid below
        'content': '1600px',
        'content-8k': '1920px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
