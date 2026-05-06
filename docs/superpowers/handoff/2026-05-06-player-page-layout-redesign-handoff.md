# PlayerPage 布局重设计 — 交接文档

> **日期**: 2026-05-06  
> **状态**: 基础布局已实现，存在 UI 问题需修复  
> **分支**: `feat/opt-05-06` (基于之前的开发分支)  
> **设计规格**: `docs/superpowers/specs/2026-05-06-player-page-layout-redesign-design.md`  
> **实施计划**: `docs/superpowers/plans/2026-05-06-player-page-layout-redesign.md`

---

## 1. 已完成的变更

### 新增组件
| 文件 | 说明 |
|------|------|
| `src/components/player/PanelHeader.tsx` | 通用面板标题栏（标题 + 收起/展开/隐藏按钮） |
| `src/components/player/MediaPreviewPanel.tsx` | 媒体预览面板（封装 MediaPlayer / YouTubePlayer） |
| `src/components/player/TimelineToolbar.tsx` | 底部工具栏（播放控制、功能按钮、面板控制） |
| `src/components/player/TimelinePanel.tsx` | 底部集成面板（Toolbar + 时间轴 + Waveform） |

### 修改的文件
| 文件 | 说明 |
|------|------|
| `src/stores/layoutStore.ts` | 扩展了面板显隐/折叠状态 |
| `src/pages/PlayerPage.tsx` | 重写为 `react-resizable-panels` 三面板布局 |
| `src/components/waveform/WaveformVisualizer.tsx` | 移除外层 padding/border |
| `src/components/controls/CombinedControls.tsx` | 标记为 deprecated |
| `src/components/transcript/TranscriptPanel.tsx` | 修复 button 嵌套 DOM 警告 |

### 新依赖
- `react-resizable-panels` (已安装)

### 构建状态
- `npm run build` ✅ 通过
- `npm run lint` ✅ 通过

---

## 2. 当前截图反映的问题

### 问题 1: 底部存在多余的浮动控制条 ❌

**现象**: 截图最底部有一个深色浮动条，包含多个图标（循环箭头、双箭头、全屏等）。这不是设计的一部分。

**可能原因**:
- `MobileControls` 组件可能在某些条件下仍然被渲染
- `AppLayoutBase` 或 `ElectronAppLayout` 中可能有底部导航/控制条
- `MediaPlayer` 组件内部可能有自定义控制层
- 可能是浏览器的 native controls（但从样式看不像）

**排查方向**:
1. 检查 `AppLayoutBase.tsx` 和 `ElectronAppLayout.tsx` 是否有底部 toolbar/slot
2. 检查 `MediaPlayer.tsx` 是否有额外的 controls overlay
3. 检查 `useKeyboardShortcuts` 或 `usePlaybackPersistence` 是否挂载了 DOM 元素
4. 用浏览器 DevTools 检查该元素的 className / 组件名来定位来源

### 问题 2: Waveform 区域存在多余的 UI 元素 ❌

**现象**:
- 波形图左下角有文字 "Loop: Drag on waveform to select loop area"
- 波形图右下角有一个浮动录音按钮（麦克风图标）
- 波形图底部有一个时间显示 "00:12.1"

**设计意图**: 这些元素应该整合到 TimelineToolbar 中，而不是浮动在波形图上。

**排查方向**:
- 检查 `WaveformVisualizer.tsx` 的 canvas 绘制逻辑，是否有绘制文字和按钮的逻辑
- 检查 `WaveformVisualizer.tsx` 的 return JSX，是否有 overlay 元素（如录音按钮、提示文字）
- 从截图看录音按钮是 HTML 元素（有阴影效果），不是 canvas 绘制的，所以应该在 JSX 中

### 问题 3: Video 面板上方有白色空白区域 ❌

**现象**: Video 面板中，视频上方有一块白色/浅灰色区域，显示 "0:12 / 5:45" 和控制按钮（播放、音量、全屏）。

**分析**: 这看起来像是**视频自带的原生 controls** 或者 **MediaPlayer 组件的自定义 controls** 叠加在了视频上方。我们设计中的视频应该在 MediaPreviewPanel 中只显示纯视频画面，播放控制统一在底部的 TimelineToolbar。

**排查方向**:
- 检查 `MediaPlayer.tsx` 是否设置了 `controls` 属性或渲染了自定义 controls
- 检查 `MediaPreviewPanel.tsx` 传递给 `MediaPlayer` 的 props
- 确保视频播放器不显示自带的控制条

### 问题 4: 面板标题文案 ❓

**现象**: Transcript 面板标题显示 "MEDIA TRANSCRIPT" 而不是设计中的 "Transcript"。

**说明**: 这是 TranscriptPanel 内部的标题，不是我添加的 PanelHeader 标题。可能需要统一文案。

**建议**: 如果用户在意，可以修改 TranscriptPanel 中的标题或使用翻译键 `transcript.title`。

### 问题 5: 整体视觉风格不匹配 ❓

**现象**: 当前实现使用浅色主题，而参考设计是深色主题。底部波形区域虽然用了深色背景，但 Toolbar 是浅色。

**说明**: 项目本身支持亮色/暗色模式（通过 Tailwind `dark:` 前缀）。当前截图看起来是亮色模式。如果用户期望默认暗色，可能需要调整主题默认值或 TimelinePanel 的默认样式。

---

## 3. 关键代码位置

### 底部浮动条排查
```bash
# 可能的位置
grep -n "MobileControls\|CombinedControls\|bottom-0\|fixed bottom" src/components/layout/*.tsx src/components/electron/*.tsx src/components/player/*.tsx

# AppLayoutBase 底部
grep -n "bottom\|footer\|toolbar" src/components/layout/AppLayoutBase.tsx
```

### Waveform 多余元素排查
```bash
# WaveformVisualizer.tsx 中查找 overlay / 文字 / 按钮
grep -n "Loop\|Drag\|microphone\|mic\|record\|00:" src/components/waveform/WaveformVisualizer.tsx

# 查找 return 语句后的 JSX 元素
grep -n "<button\|<div.*absolute\|<span.*Loop" src/components/waveform/WaveformVisualizer.tsx
```

### Video controls 排查
```bash
# MediaPlayer 中查找 controls
grep -n "controls\|Controls\|video" src/components/player/MediaPlayer.tsx
```

---

## 4. 设计意图 vs 当前实现差距

| 设计意图 | 当前实现 | 差距 |
|---------|---------|------|
| 底部只有 TimelinePanel（Toolbar + Waveform），无其他浮动元素 | 底部有 TimelinePanel **+** 一个额外的浮动控制条 | ❌ 需要移除额外浮动条 |
| Waveform 区域纯净，无浮动按钮/文字 | Waveform 上有 "Loop" 提示文字、录音按钮、时间显示 | ❌ 需要清理或移入 Toolbar |
| Video 面板只显示视频画面 | Video 面板显示视频 + 原生 controls 条 | ❌ 需要隐藏视频 controls |
| 播放控制全部集中在 TimelineToolbar | 播放控制分散在 Toolbar + 视频 controls + 浮动条 | ❌ 需要统一 |

---

## 5. 建议的修复步骤（优先级排序）

### P0: 移除底部多余浮动控制条
1. 用 DevTools 定位该元素的来源组件
2. 如果来自 `AppLayoutBase` / `ElectronAppLayout`，添加条件判断在 PlayerPage 路由下不显示
3. 如果来自 `MediaPlayer`，隐藏其 controls

### P1: 清理 Waveform 区域浮动元素
1. 检查 `WaveformVisualizer.tsx` 的 JSX，移除 Loop 提示文字和录音按钮 overlay
2. 将这些功能移入 TimelineToolbar（如果尚未存在）

### P2: 隐藏 Video 原生 controls
1. 修改 `MediaPlayer.tsx`，移除或隐藏视频 controls
2. 确保视频画面占满 MediaPreviewPanel 的内容区域

### P3: 视觉微调
- 根据用户反馈调整面板默认比例
- 统一面板标题文案
- 调整 Toolbar 按钮大小和间距

---

## 6. 已知但尚未修改的文件

以下文件在 `git status` 中显示为 modified，但**不属于本次 PlayerPage 重设计变更**，是之前其他 feature 的未提交改动：

- `electron/main.ts`
- `electron/preload.ts`
- `src/components/electron/ElectronAppLayout.tsx`
- `src/components/electron/FolderBrowser.tsx`
- `src/components/electron/PlayHistory.tsx`
- `src/components/transcript/TranscriptTextRenderer.tsx`
- `src/components/ui/SidebarRow.tsx`
- `src/components/ui/SidebarRowAction.tsx`
- `src/i18n/locales/*.json`
- `src/types/electron.d.ts`

**⚠️ 注意**: 这些文件有未提交的修改，但不要在修复 PlayerPage 时意外改动它们。

---

## 7. 测试验证清单

修复完成后验证：
- [ ] 底部只有一个 TimelinePanel，无其他浮动控制条
- [ ] Waveform 区域无浮动文字/按钮 overlay
- [ ] Video 面板只显示视频画面（无原生 controls）
- [ ] Transcript 面板正常显示（无 button 嵌套警告）
- [ ] 各面板可拖拽调整大小
- [ ] 各面板可收起/展开/隐藏
- [ ] Audio 模式下 Video 面板自动隐藏
- [ ] `npm run build` 通过
- [ ] `npm run lint` 通过
