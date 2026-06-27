# 5572 VI设计系统

## 一、品牌色彩

### 主色
| 名称 | HEX | RGB | 用途 |
|------|-----|-----|------|
| 品牌金 | #f4c24d | 244,194,77 | 主按钮、高亮、CTA |
| 品牌金深 | #d89c18 | 216,156,24 | 按钮hover状态 |
| 品牌金浅 | #ffd56f | 255,213,111 | 背景装饰 |

### 中性色
| 名称 | HEX | RGB | 用途 |
|------|-----|-----|------|
| 背景黑 | #0a0a0a | 10,10,10 | 主背景 |
| 表面黑 | #111111 | 17,17,17 | 卡片背景 |
| 边框灰 | #333333 | 51,51,51 | 边框 |
| 文字白 | #ffffff | 255,255,255 | 主要文字 |
| 文字灰 | #9ca3af | 156,163,175 | 次要文字 |

### 功能色
| 名称 | HEX | 用途 |
|------|-----|------|
| 成功 | #22c55e | 成功状态 |
| 警告 | #f59e0b | 警告状态 |
| 错误 | #ef4444 | 错误状态 |
| 信息 | #3b82f6 | 信息提示 |

## 二、字体规范

### 字体栈
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### 字号层级
| 层级 | 字号 | 字重 | 用途 |
|------|------|------|------|
| H1 | 48-64px | Bold | 页面标题 |
| H2 | 24-32px | Bold | 区块标题 |
| H3 | 18-20px | SemiBold | 卡片标题 |
| Body | 14-16px | Regular | 正文内容 |
| Caption | 12-14px | Regular | 辅助说明 |

## 三、间距规范

### 基础单位
- 4px 基础单位
- 8px 小间距
- 16px 中间距
- 24px 大间距
- 32px 超大间距

### 组件间距
| 组件 | 间距 |
|------|------|
| 卡片内边距 | 16-24px |
| 按钮内边距 | 12-16px |
| 列表项间距 | 8-12px |
| 区块间距 | 32-48px |

## 四、圆角规范

| 场景 | 圆角 |
|------|------|
| 小按钮 | 8px |
| 卡片 | 12-16px |
| 大按钮 | 16px |
| 模态框 | 24px |
| 头像 | 50% |

## 五、阴影规范

### 浅色阴影
```css
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
```

### 深色阴影
```css
box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
```

### 品牌阴影
```css
box-shadow: 0 10px 40px rgba(244, 194, 77, 0.25);
```

## 六、图标规范

### 尺寸
| 用途 | 尺寸 |
|------|------|
| 导航图标 | 24x24 |
| 按钮图标 | 20x20 |
| 列表图标 | 16x16 |
| APP图标 | 1024x1024 |

### 颜色
- 主要图标: 白色 (#ffffff)
- 次要图标: 灰色 (#9ca3af)
- 强调图标: 品牌金 (#f4c24d)

## 七、组件库

### 按钮
```tsx
// 主按钮
<button className="px-6 py-3 bg-[#f4c24d] text-black rounded-xl font-semibold">

// 次要按钮
<button className="px-6 py-3 bg-white/10 text-white rounded-xl font-semibold">

// 幽灵按钮
<button className="px-6 py-3 border border-white/20 text-white rounded-xl">
```

### 卡片
```tsx
<div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
```

### 输入框
```tsx
<input className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" />
```

## 八、动画规范

### 时长
- 快速: 150ms
- 正常: 300ms
- 慢速: 500ms

### 缓动函数
- 默认: ease-out
- 弹性: cubic-bezier(0.68, -0.55, 0.265, 1.55)

### 交互动画
- 悬停: scale(1.02)
- 点击: scale(0.98)
- 进入: opacity 0→1, translateY 10px→0
