// 图片占位符组件 - 实现骨架屏效果（支持暗色模式）
// CSS variables and keyframes are defined in globals.css to avoid duplicate injection
const ImagePlaceholder = ({ aspectRatio }: { aspectRatio: string }) => (
  <div
    className={`w-full ${aspectRatio} rounded-lg`}
    style={{
      background:
        'linear-gradient(90deg, var(--skeleton-color) 25%, var(--skeleton-highlight) 50%, var(--skeleton-color) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shine 1.5s infinite',
    }}
  />
);

export { ImagePlaceholder };
