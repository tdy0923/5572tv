'use client';

const features = [
  { icon: '⚡', title: '极速播放', desc: '多源聚合，秒开无广告' },
  { icon: '📥', title: '离线缓存', desc: 'WiFi下载，离线观看' },
  { icon: '🔄', title: '多端同步', desc: '进度漫游' },
  { icon: '🤖', title: 'AI 推荐', desc: '智能推荐' },
];

export default function FeatureGrid() {
  return (
    <section className='py-16 px-4 bg-[#111] border-t border-white/5'>
      <div className='max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4'>
        {features.map((f, i) => (
          <div
            key={i}
            className='p-5 rounded-2xl bg-white/[0.02] border border-white/5'
          >
            <span className='text-2xl'>{f.icon}</span>
            <h3 className='font-semibold mt-3 mb-1'>{f.title}</h3>
            <p className='text-sm text-gray-500'>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
