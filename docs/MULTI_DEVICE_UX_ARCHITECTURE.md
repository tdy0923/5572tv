# 5572 多设备 UX/UI/交互 架构方案

## 一、问题分析

### 当前问题
1. **单一响应式逻辑**：用 `isMobile` 二元判断，无法区分手机/平板/TV
2. **PC缩小适配**：移动端只是CSS缩放，交互逻辑未重新设计
3. **TV交互缺失**：无遥控器/Dpad导航支持
4. **平板适配粗糙**：未利用大屏优势，布局与手机相同

### 核心矛盾
| 设备 | 输入方式 | 屏幕距离 | 主要操作 | 当前状态 |
|------|----------|----------|----------|----------|
| 手机 | 触摸/手势 | 30cm | 滑动/点击 | ⚠️ 部分适配 |
| 平板 | 触摸+键盘 | 50cm | 点击+拖拽 | ❌ 与手机相同 |
| TV | 遥控器/Dpad | 3m | 导航/确认 | ❌ 完全缺失 |
| 桌面 | 鼠标+键盘 | 70cm | 精确点击 | ✅ 主要设计目标 |

---

## 二、设备分类体系

### 2.1 设备类型定义

```typescript
type DeviceType = 'phone' | 'tablet' | 'tv' | 'desktop';

interface DeviceProfile {
  type: DeviceType;
  input: 'touch' | 'remote' | 'mouse' | 'hybrid';
  screenRange: { min: number; max: number }; // 英寸
  viewDistance: 'close' | 'medium' | 'far';  // 30cm / 50cm / 3m
  interactionModel: 'gesture' | 'navigation' | 'precision';
}
```

### 2.2 设备检测策略

```typescript
// 优先级：User-Agent > 屏幕尺寸 > 交互方式
function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent;
  
  // TV检测（最高优先级）
  if (/smart tv|android tv|roku|fire tv|appletv/i.test(ua)) {
    return 'tv';
  }
  
  // 手机检测
  if (/android.*mobile|iphone|ipod/i.test(ua)) {
    return 'phone';
  }
  
  // 平板检测
  if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
    return 'tablet';
  }
  
  // 屏幕尺寸辅助判断
  if (typeof screen !== 'undefined') {
    const diagonal = Math.sqrt(screen.width ** 2 + screen.height ** 2) / screen.dpi;
    if (diagonal < 7) return 'phone';
    if (diagonal < 13) return 'tablet';
  }
  
  return 'desktop';
}
```

---

## 三、各设备独立 UX 设计

### 3.1 手机 (Phone)

**设计原则**：单手操作、拇指热区、手势优先

#### 布局
```
┌─────────────────────┐
│     顶部导航栏       │ ← 固定，高度44px
├─────────────────────┤
│                     │
│     内容区域         │ ← 可滚动
│     (单列)          │
│                     │
├─────────────────────┤
│   底部Tab导航       │ ← 固定，高度56px
└─────────────────────┘
```

#### 交互规范
| 元素 | 规范 | 说明 |
|------|------|------|
| 触摸目标 | ≥44px | 所有可点击元素 |
| 滑动 | 左右切换Tab/集数 | 手势导航 |
| 下拉刷新 | 支持 | 内容页 |
| 长按 | 显示更多操作 | 电影卡片 |
| 双击 | 播放/暂停 | 播放器 |
| 拖拽 | 调整进度/音量 | 播放器 |

#### 播放器特殊处理
- **竖屏模式**：视频在上方，信息在下方（可滚动）
- **横屏模式**：全屏播放，控制层叠加
- **手势区域划分**：
  - 左侧1/3：亮度调节
  - 中间1/3：进度调节
  - 右侧1/3：音量调节

### 3.2 平板 (Tablet)

**设计原则**：利用大屏、多栏布局、触控+键盘

#### 布局
```
┌──────────────────────────────────────┐
│           顶部导航栏                  │
├────────────────┬─────────────────────┤
│                │                     │
│    侧边栏      │      内容区域       │
│    (可折叠)    │      (多列网格)     │
│                │                     │
└────────────────┴─────────────────────┘
```

#### 交互规范
| 元素 | 规范 | 说明 |
|------|------|------|
| 触摸目标 | ≥48px | 比手机更大 |
| 网格列数 | 3-4列 | 利用屏幕宽度 |
| 侧边栏 | 可折叠 | 显示分类/收藏 |
| 键盘快捷键 | 支持 | 空格播放、方向键导航 |
| 拖拽 | 支持 | 拖拽排序收藏 |

#### 播放器特殊处理
- **画中画**：支持系统PiP
- **分屏**：一边播放一边浏览
- **外接键盘**：完整快捷键支持

### 3.3 电视 (TV)

**设计原则**：10英尺UI、Dpad导航、视觉优先

#### 布局
```
┌────────────────────────────────────────────┐
│                                            │
│    ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐│
│    │ 海报 │  │ 海报 │  │ 海报 │  │ 海报 ││
│    │      │  │      │  │      │  │      ││
│    └──────┘  └──────┘  └──────┘  └──────┘│
│         大图标 + 清晰文字                   │
│                                            │
│    ← 左右导航 →                             │
│    [确认] 播放   [返回] 退出                 │
│                                            │
└────────────────────────────────────────────┘
```

#### 交互规范
| 元素 | 规范 | 说明 |
|------|------|------|
| 最小触摸/焦点区 | ≥64px | 远距离观看 |
| 文字大小 | ≥24px | 3米距离可读 |
| 对比度 | ≥4.5:1 | 暗环境观看 |
| 焦点状态 | 明显高亮 | 白色边框+放大 |
| 导航 | Dpad四向+确认+返回 | 遥控器操作 |
| 动画 | 减少/禁用 | 低端设备性能 |

#### 遥控器按键映射
```
遥控器          →  应用操作
─────────────────────────────
↑↓←→           →  焦点移动
确认/OK         →  选择/播放
返回/Back       →  返回上一页
主页/Home       →  回到首页
播放/暂停       →  播放控制
菜单/Options    →  更多选项
```

#### TV专属组件
```typescript
// 焦点管理器
function TVFocusManager({ children }) {
  // 自动管理焦点在网格中的移动
  // 支持循环导航（到边界后回到对面）
  // 记住每个页面的焦点位置
}

// TV导航栏
function TVNavBar({ items, onFocusChange }) {
  // 水平大图标导航
  // 当前项放大+高亮
  // 支持左右滑动
}
```

### 3.4 桌面 (Desktop)

**设计原则**：精确操作、信息密度、多任务

#### 布局
```
┌──────────────────────────────────────────────┐
│  Logo   搜索框        导航    用户  设置     │
├──────────────────────────────────────────────┤
│                                              │
│   ┌─────────────────────────────────────┐   │
│   │           Hero Banner               │   │
│   └─────────────────────────────────────┘   │
│                                              │
│   热门电影  [更多]                            │
│   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│   │    │ │    │ │    │ │    │ │    │       │
│   └────┘ └────┘ └────┘ └────┘ └────┘       │
│                                              │
└──────────────────────────────────────────────┘
```

#### 交互规范
| 元素 | 规范 | 说明 |
|------|------|------|
| 鼠标悬停 | 显示详情/操作 | Hover状态 |
| 右键菜单 | 支持 | 更多操作 |
| 键盘快捷键 | 完整支持 | 效率操作 |
| 多窗口 | 支持 | 分屏对比 |
| 拖拽 | 支持 | 拖拽排序 |

---

## 四、技术实现方案

### 4.1 设备上下文重构

```typescript
// src/lib/device-context.tsx
interface DeviceContextType {
  // 设备类型
  type: DeviceType;
  input: 'touch' | 'remote' | 'mouse' | 'hybrid';
  
  // 能力检测
  capabilities: {
    touch: boolean;
    hover: boolean;
    keyboard: boolean;
    gamepad: boolean;
  };
  
  // 性能等级
  performance: 'low' | 'medium' | 'high';
  
  // 网络状态
  network: 'slow' | 'medium' | 'fast';
  
  // 辅助方法
  isMobile: boolean;   // phone | tablet
  isTV: boolean;
  isDesktop: boolean;
}
```

### 4.2 组件适配策略

#### 策略1：条件渲染
```tsx
function VideoCard({ video }) {
  const { type } = useDevice();
  
  return (
    <>
      {type === 'tv' && <TVVideoCard video={video} />}
      {type === 'phone' && <PhoneVideoCard video={video} />}
      {type === 'tablet' && <TabletVideoCard video={video} />}
      {type === 'desktop' && <DesktopVideoCard video={video} />}
    </>
  );
}
```

#### 策略2：Hook适配
```tsx
function useVideoCardLayout() {
  const { type } = useDevice();
  
  return useMemo(() => {
    switch (type) {
      case 'tv':
        return { columns: 5, imageHeight: 200, showTitle: true };
      case 'phone':
        return { columns: 2, imageHeight: 150, showTitle: false };
      case 'tablet':
        return { columns: 3, imageHeight: 180, showTitle: true };
      default:
        return { columns: 5, imageHeight: 200, showTitle: true };
    }
  }, [type]);
}
```

#### 策略3：CSS变量动态主题
```css
/* 根据设备类型设置CSS变量 */
:root[data-device="phone"] {
  --touch-target: 44px;
  --font-size-base: 14px;
  --spacing-unit: 8px;
  --grid-columns: 2;
}

:root[data-device="tablet"] {
  --touch-target: 48px;
  --font-size-base: 16px;
  --spacing-unit: 12px;
  --grid-columns: 3;
}

:root[data-device="tv"] {
  --touch-target: 64px;
  --font-size-base: 20px;
  --spacing-unit: 16px;
  --grid-columns: 5;
  --focus-ring: 3px solid white;
}
```

### 4.3 TV导航系统

```typescript
// src/hooks/useTVNavigation.ts
export function useTVNavigation(containerRef: RefObject<HTMLElement>) {
  const [focusIndex, setFocusIndex] = useState(0);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          e.preventDefault();
          navigateFocus(e.key);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          activateFocused();
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          goBack();
          break;
      }
    };
    
    containerRef.current?.addEventListener('keydown', handleKeyDown);
    return () => containerRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [focusIndex]);
  
  return { focusIndex, setFocusIndex };
}
```

---

## 五、实施路线图

### Phase 1：基础架构（1-2周）
1. 重构 `DeviceContext`，支持4种设备类型
2. 创建设备检测工具函数
3. 建立CSS变量主题系统

### Phase 2：手机优化（2-3周）
1. 重构手机端布局（单列+底部Tab）
2. 实现手势操作系统
3. 优化播放器竖屏/横屏切换

### Phase 3：平板适配（2周）
1. 实现多栏布局
2. 添加键盘快捷键支持
3. 优化画中画体验

### Phase 4：TV适配（3-4周）
1. 实现Dpad导航系统
2. 创建TV专属组件
3. 优化大屏视觉效果
4. 适配遥控器按键

### Phase 5：测试优化（2周）
1. 各设备真机测试
2. 性能优化
3. 无障碍适配

---

## 六、质量保证

### 测试矩阵
| 设备 | 分辨率 | 交互方式 | 测试重点 |
|------|--------|----------|----------|
| iPhone SE | 375x667 | 触摸 | 单手操作、小屏适配 |
| iPhone 15 Pro | 393x852 | 触摸 | 刘海屏、安全区域 |
| iPad Air | 820x1180 | 触摸+键盘 | 多栏布局、分屏 |
| Android TV | 1920x1080 | 遥控器 | Dpad导航、焦点管理 |
| Smart TV | 3840x2160 | 遥控器 | 4K适配、文字清晰度 |
| Desktop | 1920x1080 | 鼠标+键盘 | 精确操作、多任务 |

### 验收标准
1. **手机**：所有操作可单手完成，触摸目标≥44px
2. **平板**：利用大屏优势，信息密度提升30%
3. **TV**：遥控器可完成所有核心操作，无需触屏
4. **桌面**：键盘快捷键覆盖80%常用操作
