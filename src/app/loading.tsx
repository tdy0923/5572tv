export default function Loading() {
  return (
    <div className='flex min-h-[400px] flex-col items-center justify-center gap-4'>
      <div className='w-9 h-9 rounded-full border-2 border-gray-200 border-t-primary-500 animate-spin' />
      <p
        className='text-sm font-medium'
        style={{ color: 'var(--color-foreground-muted)' }}
      >
        加载中...
      </p>
    </div>
  );
}
