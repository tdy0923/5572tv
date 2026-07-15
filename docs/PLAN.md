# 全站设计系统统一与播放器体验提升计划

## 一、Web 端：设计系统统一（Fluent 2）

### 现状

全站存在 3 套并行的按钮系统 + 多处重复 CSS/组件：

| 问题                               | 详情                                                                                              | 优先级 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| `fluent2-*` CSS 类已定义但从未使用 | `.fluent2-button-primary`、`.fluent2-button-subtle`、`.fluent2-input`、`.fluent2-card` 是荒地代码 | P0     |
| `ui-*` 与 `fluent2-*` 两套并存     | `ui-primary-button`(用) vs `fluent2-button-primary`(死)、`ui-input`(用) vs `fluent2-input`(死)    | P0     |
| 3 种按钮模式                       | `ui-primary-button` / `PillButton` 组件 / 零散 Tailwind                                           | P0     |
| 2 种输入框                         | `ui-input`(圆角8px/琥珀色焦点) vs `PanelField`(圆角16px/绿色焦点)                                 | P1     |
| 4 套同名动画                       | `fadeIn` / `fade-in` / `fluent2-fade-in` / SkipController 局部 `fade-in`                          | P1     |
| 3 套骨架屏                         | `SkeletonCard` / `FluentSkeletonCard` / `DoubanCardSkeleton`                                      | P2     |
| 4 套视频卡片                       | `VideoCard` / `ShortDramaCard`(70%重复) / `PhoneVideoCard` / `TVVideoCard` / `MiniVideoCard`      | P2     |
| 导航三套独立                       | `ModernNav` / `Sidebar` / `MobileBottomNav` 各自维护菜单列表                                      | P2     |
| 废弃组件                           | `FluentIcon` wrapper、`FluentFadeIn/SlideUp/ScaleIn` transition 组件                              | P2     |

### 方案

**不改页面代码，只改 CSS 定义 + 清理荒地：**

| 步骤 | 具体操作                                | 涉及文件                                                                                                  |
| ---- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | 删除死掉的 `fluent2-*` 类               | `globals.css` 删除 `.fluent2-card`、`.fluent2-button-primary`、`.fluent2-input`、`.fluent2-button-subtle` |
| 2    | 把 `ui-*` 类的样式改为 Fluent 2 设计    | `globals.css`：`rounded-lg`(8px) → `rounded`(4px)、统一用 `--color-*` 色板变量、Fluent motion 过渡        |
| 3    | 合并重复动画，统一保留 `fluent2-*` 命名 | `globals.css` 删除 `fadeIn`、`scaleIn`、`shimmer`、`fade-in`、`shine`；保留 `fluent2-*` 系列              |
| 4    | 统一 `ui-input` 与 `PanelField`         | 统一圆角为 8px(`rounded-lg`)，焦点环统一为 `primary-500`（琥珀色）                                        |
| 5    | 清理废弃组件                            | 删除 `FluentIcon.tsx`、`FluentTransition.tsx` 中未使用的动画组件                                          |
| 6    | 合并骨架屏                              | 保留 `SkeletonCard`（基于 `FluentSkeleton`），删除 `FluentSkeletonCard` 和 `DoubanCardSkeleton`           |
| 7    | 导航菜单抽离共享配置                    | 将 `ModernNav`/`Sidebar`/`MobileBottomNav` 中的菜单定义提取到共享常量文件                                 |

---

## 二、Flutter APP：图标 + 设计统一

### 现状

- 启动图标：源文件 `flutter_app/logo.png` → 生成到 `mipmap-*dpi/launcher_icon.png`
- 设计系统：APP 已经有 Fluent 2 色板（`flutter_app/lib/theme/app_theme.dart`），但基于 Material 3 实现
- 图标源：使用 `lucide_icons_flutter` 包，与 Web 端一致

### 方案

| 步骤 | 具体操作                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **更换 APP 启动图标**：重新设计 `logo.png`，确保在浅色/深色背景下都清晰可见（当前黑色图标看不清）                                                  |
| 2    | **Fluent 2 图标包**：检查 `lucide_icons_flutter` 是否完整支持 Fluent 2 所需的图标集；若需补充，引入 Fluent UI 系统图标包 `fluentui_system_icons`   |
| 3    | **主题同步**：确保 APP 的 `app_theme.dart` 色板与 Web 端 `globals.css` 的 CSS 变量完全对齐（`--primary-500` = `#F4C24D`、`--color-background` 等） |
| 4    | **按钮组件统一**：封装 `FluentButton` / `FluentIconButton` Widget，替代散布各处的零散 `ElevatedButton` / `TextButton` 样式                         |

---

## 三、Flutter APP：播放器体验提升（竖屏短剧）

### 现状

- 播放器固定 16:9 比例（`player_screen.dart` 2722-2738 行）
- 短剧内容（竖屏 9:16）在横屏播放器内上下留黑边，大屏体验差
- 播放器不支持根据视频实际分辨率自动切换比例

### 方案

| 方案                 | 复杂度 | 效果  | 说明                                                                                                           |
| -------------------- | ------ | ----- | -------------------------------------------------------------------------------------------------------------- |
| **A. 自动检测比例**  | 低     | ★★★   | 加载视频后读取 `Media.stream.width/height`，动态设置 `aspectRatio`。竖屏视频自动切换为 9:16，横屏保持 16:9     |
| **B. 智能裁剪/缩放** | 中     | ★★★★  | 针对竖屏内容提供"铺满"模式：纵向铺满屏幕，横向裁剪两侧，类似抖音全屏效果。用户可切换"原始比例"和"铺满"模式     |
| **C. 旋转按钮**      | 低     | ★★★   | 在播放器控制栏添加旋转 90° 按钮，用户手动旋转竖屏视频全屏观看                                                  |
| **D. 竖屏专用模式**  | 高     | ★★★★★ | 检测到短剧时，播放器进入"竖屏优先模式"：强制锁定竖屏全屏、上下滑动切换集数（类似抖音/快手交互）、双击暂停/点赞 |

### 实施路线

| 阶段        | 内容                     | 涉及文件                                                                                              |
| ----------- | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Phase 1** | 方案 A：自动检测视频比例 | `video_player_widget.dart`：读取 `Media.stream` 的宽高，动态设置 `aspectRatio`                        |
|             | 方案 C：手动旋转按钮     | `mobile_player_controls.dart` / `pc_player_controls.dart`：添加旋转 90° 按钮，调用 `Orientation` 锁定 |
| **Phase 2** | 方案 B：智能铺满模式     | 播放器添加 "fit" 模式切换（contain / cover / fill），竖屏内容可选 `BoxFit.cover` 全屏铺满             |
|             | 短剧检测标记             | `player_screen.dart` 中 `source === 'shortdrama'` 时显示竖屏优化控制栏                                |
| **Phase 3** | 方案 D：竖屏专用交互     | 新增 `ShortDramaPlayerScreen` 或 `player_screen.dart` 分支逻辑：纵向全屏 + 上下滑动切集 + 双击暂停    |

---

## 四、时间规划

| 阶段        | 范围                                       | 预估工时 |
| ----------- | ------------------------------------------ | -------- |
| **Phase 1** | Web 端 CSS 清理（删死代码+改 `ui-*` 定义） | 0.5h     |
| **Phase 2** | Web 端动画/骨架屏/输入框统一               | 1h       |
| **Phase 3** | Web 端导航菜单抽离共享                     | 1h       |
| **Phase 4** | APP 图标更换 + 主题同步                    | 1h       |
| **Phase 5** | APP 播放器：自动比例检测 + 旋转按钮        | 2h       |
| **Phase 6** | APP 播放器：铺满模式 + 竖屏交互优化        | 3h       |

---

## 五、验证 checklist

- [ ] `fluent2-*` CSS 类全删完，无残留引用
- [ ] `ui-primary-button` / `ui-secondary-button` 视觉为 Fluent 2 风格（4px 圆角、正确色板、正确阴影）
- [ ] 无重复动画 keyframes
- [ ] 无重复骨架屏组件
- [ ] APP 图标在浅色/深色桌面都清晰可见
- [ ] APP 短剧播放器：竖屏内容自动填充屏幕
- [ ] APP 播放器控制栏有旋转/铺满切换按钮
