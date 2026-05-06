# PlayerPage 布局重设计规格

**日期**: 2026-05-06  
**主题**: PlayerPage 三面板自适应布局重设计  
**状态**: 待审核

---

## 1. 设计目标

参考 Descript 等视频编辑工具的布局风格，将播放控制、波形时间轴、字幕脚本和视频预览整合到一个统一的工作区中。所有操作面板均可展开/收起/缩放/隐藏，用户可根据需要灵活调整界面。

### 核心原则
- **操作集中化**：播放控制、A-B 循环、录音等功能全部集成到底部波形区域
- **组件复用**：TranscriptPanel 组件保持不变，仅调整位置和容器
- **自适应布局**：各面板尺寸和显隐状态联动，其他面板自动填充空间
- **媒体类型感知**：Audio 文件自动隐藏 Video 面板

---

## 2. 整体布局架构

```
┌─────────────────────────────────────────────────────────┐
│  AppLayout (sidebar + header)                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PlayerPage Content                             │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  Upper Area (flex: 1)                   │   │   │
│  │  │  ┌──────────────┬───┬──────────────┐   │   │   │
│  │  │  │ Transcript   │↔️ │   Video      │   │   │   │
│  │  │  │   Panel      │   │   Preview    │   │   │   │
│  │  │  │  (resizable) │   │  (resizable) │   │   │   │
│  │  │  └──────────────┴───┴──────────────┘   │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │  Bottom Panel (resizable height)        │   │   │
│  │  │  ┌─────────────────────────────────┐   │   │   │
│  │  │  │ Toolbar: Play | Record | Loop   │   │   │   │
│  │  │  │        | Speed | A-B | ...      │   │   │   │
│  │  │  ├─────────────────────────────────┤   │   │   │
│  │  │  │ Time Ruler (0:00 --- 0:25 ---)  │   │   │   │
│  │  │  ├─────────────────────────────────┤   │   │   │
│  │  │  │ Waveform Canvas (drag, zoom)    │   │   │   │
│  │  │  │  [ bookmarks | playhead | loop] │   │   │   │
│  │  │  └─────────────────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 面板层级

| 层级 | 组件 | 说明 |
|------|------|------|
| L4 | `PlayerPage` | 页面入口，管理整体布局状态 |
| L3 | `ResizablePanelGroup` (vertical) | 上下分割：上部内容区 + 底部面板 |
| L3 | `ResizablePanelGroup` (horizontal) | 上部水平分割：Transcript + Video |
| L2 | `TranscriptPanel` | 现有组件，无改动 |
| L2 | `MediaPreviewPanel` | 视频/音频预览面板（新组件） |
| L2 | `TimelinePanel` | 底部集成面板：Controls + Waveform（新组件） |

---

## 3. 面板详细设计

### 3.1 上部区域 — Transcript + Video

#### Transcript 面板（左侧）
- **组件**: 复用现有 `TranscriptPanel`，不做任何组件内部修改
- **标题栏**: 新增，显示 "Transcript" + 面板控制按钮（─ □ ×）
- **最小宽度**: 240px
- **默认宽度**: 占上部 60%
- **收起状态**: 折叠为仅显示标题栏（高度 ~32px）
- **隐藏状态**: 完全移除，Video 面板占满上部

#### Video 预览面板（右侧）
- **组件**: 新组件 `MediaPreviewPanel`，封装现有的 `MediaPlayer` / `YouTubePlayer`
- **标题栏**: 显示 "Video" + 面板控制按钮
- **最小宽度**: 200px
- **默认宽度**: 占上部 40%
- **Audio 模式**: 当 `currentFile` 为 audio 类型或纯 YouTube audio 时，此面板**自动隐藏**
- **收起/隐藏**: 同 Transcript 面板逻辑

#### 水平拖拽分隔线
- 位于 Transcript 和 Video 之间
- 拖拽时实时调整两侧面板宽度
- 双击分隔线：重置为默认比例（60/40）

### 3.2 底部区域 — TimelinePanel（波形 + 控制）

#### Toolbar 行
- **高度**: 40px
- **背景**: 略深于面板底色，底部带 1px 分隔线
- **左侧 — 播放控制**:
  - 后退按钮（SkipBack，带秒数提示）
  - 播放/暂停按钮（圆形主按钮，高对比度）
  - 前进按钮（SkipForward，带秒数提示）
  - 时间显示 `currentTime / duration`（等宽字体）
- **中部 — 功能按钮**:
  - Record 录音按钮（红色高亮）
  - Loop 循环开关（Toggle，激活时高亮）
  - A-B 循环设置按钮
  - 播放速度 `playbackRate`（点击打开速度选择 Popover）
  - Split（如适用）
  - 更多设置（Popover：seek step, loop repeats, gap 等）
- **右侧 — 面板控制**:
  - 最小化 `─`：收起面板为仅保留播放控制 + 细进度条
  - 最大化 `□`：恢复完整面板
  - 隐藏 `×`：完全隐藏底部面板

#### 时间轴刻度行
- **高度**: 18-20px
- **内容**: 根据可见时间范围动态渲染时间刻度（0:00, 0:10, 0:20...）
- **样式**: 灰色小字，等宽字体

#### Waveform 画布区域
- **组件**: 复用现有 `WaveformVisualizer`，调整容器样式适配新布局
- **背景**: 深色底色（`#0a0a1a` 或主题暗色）
- **内容**:
  - 主波形（上半部，主题色）
  - Shadowing 波形（下半部，成功色）
  - Bookmark lanes（顶部，紫色条带）
  - Playhead（红色竖线 + 顶部三角标记）
  - A-B loop markers（绿色 A / 蓝色 B）
  - 拖拽选择区域（半透明主题色覆盖）
- **交互提示**: 右下角显示操作提示文字（Scroll pan · Ctrl+Scroll zoom · Drag select · Alt+Drag pan）

#### 收起状态
- **高度**: 约 48px
- **内容**:
  - 左侧：播放/暂停 + 时间显示
  - 中部：细进度条（2px 高，已播放部分主题色）
  - Playhead 小圆点标记
  - 右侧：展开按钮 `□`

---

## 4. 面板状态与交互

### 4.1 状态管理

新增 Zustand store（或扩展现有 `playerStore` / `layoutSettings`）：

```typescript
interface PlayerLayoutState {
  // 上部面板
  transcriptPanel: { visible: boolean; collapsed: boolean; size: number };
  videoPanel: { visible: boolean; collapsed: boolean; size: number };
  
  // 底部面板
  timelinePanel: { visible: boolean; collapsed: boolean; size: number };
  
  // 操作方法
  togglePanel: (panel: 'transcript' | 'video' | 'timeline') => void;
  collapsePanel: (panel: 'transcript' | 'video' | 'timeline') => void;
  setPanelSize: (panel: string, size: number) => void;
}
```

### 4.2 面板显隐逻辑

| 操作 | Transcript | Video | Timeline | 效果 |
|------|-----------|-------|----------|------|
| 初始（Video 媒体） | visible | visible | visible | 三面板均显示 |
| 初始（Audio 媒体） | visible | **hidden** | visible | Video 自动隐藏 |
| 点击 Video × | — | hidden | — | Transcript 占满上部 |
| 点击 Transcript × | hidden | — | — | Video 占满上部 |
| 点击 Timeline × | — | — | hidden | 上部区域占满全高 |
| 点击 ─（收起） | collapsed | collapsed | collapsed | 折叠为最小高度 |
| 点击 □（展开） | expanded | expanded | expanded | 恢复之前大小 |

### 4.3 自适应行为

- **面板的可见性变化**：使用 `react-resizable-panels` 的 `collapsible` 和 `minSize` 属性，当面板隐藏时，其他面板自动扩展
- **窗口大小变化**：面板比例保持相对不变，但受 `minSize` 约束
- **移动端**：简化布局，上部堆叠显示，底部面板固定为收起状态（仅播放控制 + 进度条）

---

## 5. 技术方案

### 5.1 依赖

- `react-resizable-panels`（新增依赖）：实现拖拽调整面板大小
  - 支持嵌套 PanelGroup（水平 + 垂直）
  - 支持 `collapsible` 属性实现折叠/展开
  - 支持 `onResize` 持久化面板大小到 localStorage

### 5.2 组件拆分

**新增组件**:
1. `src/components/player/TimelinePanel.tsx` — 底部波形+控制集成面板
2. `src/components/player/MediaPreviewPanel.tsx` — 媒体预览面板（含标题栏）
3. `src/components/player/PanelHeader.tsx` — 通用面板标题栏（标题 + ─ □ ×）

**修改组件**:
1. `src/pages/PlayerPage.tsx` — 重写布局结构，使用 ResizablePanelGroup
2. `src/components/controls/CombinedControls.tsx` — 提取控制按钮逻辑到 TimelinePanel Toolbar
3. `src/components/waveform/WaveformVisualizer.tsx` — 调整样式适配新容器

**保持不变的组件**:
- `src/components/transcript/TranscriptPanel.tsx` — 仅外层容器改变
- `src/components/player/MediaPlayer.tsx` — 无改动
- `src/components/player/YouTubePlayer.tsx` — 无改动

### 5.3 架构合规性

根据项目 4 层架构规则：
- `PlayerPage`（L4）可以导入任何层级组件
- `TimelinePanel`、`MediaPreviewPanel`（L2）只能导入 L1-L2 组件
- 平台判断 `isElectron()` 仅在 `PlayerPage` 中使用（已有合规）
- 不使用 `window.electronAPI` 在新组件中

---

## 6. 状态持久化

- 各面板的大小和显隐状态持久化到 `localStorage`
- Key 命名: `abloop-player-layout-{panel}`
- 在 `PlayerPage` 初始化时读取，布局变化时写入
- Audio/Video 类型切换时，Video 面板的 `visible` 状态由媒体类型决定，但用户手动设置优先

---

## 7. 移动端适配

- 使用 `useWindowSize` 或 `useMediaQuery` 检测移动端
- 移动端布局：
  - 上部：Transcript 全宽，Video 在 Transcript 下方（如存在）
  - 底部：TimelinePanel 固定为收起状态（仅播放控制 + 进度条）
  - 禁用面板拖拽调整大小（触摸体验不佳）
  - 面板显隐通过按钮切换，而非拖拽

---

## 8. 风险与回滚

| 风险 | 缓解措施 |
|------|---------|
| react-resizable-panels 与现有样式冲突 | 使用 `className` 覆盖默认样式，隔离影响范围 |
| WaveformVisualizer 在新容器中绘制异常 | 保持 canvas 尺寸计算逻辑不变，仅调整外层容器 |
| TranscriptPanel 在较窄面板中显示问题 | 设置最小宽度 240px，低于时自动隐藏或折叠 |
| 用户不适应新布局 | 保留原布局代码为注释或独立分支，便于快速回滚 |
| 移动端体验下降 | 移动端保持简化布局，不启用复杂拖拽 |

---

## 9. 验收标准

- [ ] 三面板布局正常渲染，各面板之间可拖拽调整大小
- [ ] 播放控制按钮全部集成到底部面板 Toolbar
- [ ] Waveform 在底部面板内正常显示和交互（拖拽、缩放、pan）
- [ ] TranscriptPanel 组件无改动，仅位置调整
- [ ] Audio 媒体自动隐藏 Video 面板
- [ ] 各面板可展开/收起/隐藏，其他面板自适应填充
- [ ] 面板状态持久化到 localStorage
- [ ] 移动端显示简化布局
- [ ] `npm run build` 通过
- [ ] `npm run lint` 通过

---

## 10. 附录：现有代码影响清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/pages/PlayerPage.tsx` | 重写 | 替换现有布局为 ResizablePanelGroup 架构 |
| `src/components/controls/CombinedControls.tsx` | 修改 | 提取 Toolbar 按钮逻辑，或标记为 deprecated |
| `src/components/waveform/WaveformVisualizer.tsx` | 修改 | 调整外层容器样式 |
| `src/contexts/layoutSettings.tsx` | 扩展 | 添加面板状态管理 |
| `src/components/player/TimelinePanel.tsx` | 新增 | 底部集成面板 |
| `src/components/player/MediaPreviewPanel.tsx` | 新增 | 媒体预览面板 |
| `src/components/player/PanelHeader.tsx` | 新增 | 通用面板标题栏 |
