const ImagePlaceholder = ({ aspectRatio }: { aspectRatio: string }) => (
  <div
    className={`w-full ${aspectRatio} rounded-lg`}
    style={{
      background:
        'linear-gradient(90deg, var(--color-background-muted) 25%, var(--color-background-subtle) 50%, var(--color-background-muted) 75%)',
      backgroundSize: '200% 100%',
      animation: 'fluent2-shimmer 1.5s ease-in-out infinite',
    }}
  />
);

export { ImagePlaceholder };
