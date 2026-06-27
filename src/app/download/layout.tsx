export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-black text-white">{children}</body>
    </html>
  );
}
