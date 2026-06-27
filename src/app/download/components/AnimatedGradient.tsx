'use client';

/**
 * 微妙的动画渐变背景
 * 不是花里胡哨，而是高级感
 */
export default function AnimatedGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 主渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0a0a0a]" />
      
      {/* 微妙的光晕 - 缓慢移动 */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[150px] opacity-5"
        style={{
          background: 'radial-gradient(circle, #f4c24d 0%, transparent 70%)',
          animation: 'float 20s ease-in-out infinite',
          top: '10%',
          left: '20%',
        }}
      />
      
      {/* 第二个光晕 */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-3"
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          animation: 'float 25s ease-in-out infinite reverse',
          bottom: '20%',
          right: '15%',
        }}
      />

      {/* 动画定义 */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(30px, -30px); }
          50% { transform: translate(-20px, 20px); }
          75% { transform: translate(20px, -10px); }
        }
      `}</style>
    </div>
  );
}
