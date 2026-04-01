# Pictures 页面拖拽卡顿优化记录

## 背景

当前项目的 `pictures` 页面采用 Polaroid 风格照片堆叠布局，用户可以直接拖拽单张照片调整位置。使用过程中，拖拽图片会有明显卡顿感，表现为跟手性不足、位移更新不够丝滑。

本次优化的目标是：

- 降低图片拖拽过程中的主线程压力
- 减少拖拽期间不必要的 React 重渲染
- 保持现有交互行为不变，包括点击打开预览、拖拽结束后保存位置、边界限制等

## 问题现象

拖拽 `pictures` 页面中的图片时，可以观察到以下现象：

- 鼠标或手指移动较快时，卡片视觉位置存在轻微滞后
- 拖拽过程中动画组件和图片容器频繁参与渲染
- 随着页面卡片数量增加，拖拽体感会进一步下降

## 排查过程

本次排查主要聚焦在两个位置：

1. `apps/web/src/components/pictures/PictureStack.tsx`
2. `apps/web/src/hooks/useDrag.ts`

### 1. PictureStack 的拖拽路径

`PictureStack` 中每张图片由 `DraggableCard` 渲染。原实现中：

- `useDrag` 在每次 `pointermove` 时都调用 `setDragDelta`
- `DraggableCard` 通过 `dragDelta` 重新计算 `transform`
- 卡片内部又包含 `framer-motion` 的 `motion.div` 和 `next/image`

这意味着拖拽期间每一帧都要走一次 React render 路径，虽然只影响当前卡片，但当前卡片的整个子树都会跟着重新参与渲染和协调。

### 2. useDrag 的更新方式

原始 `useDrag` 的核心问题是：

- 每次指针移动都直接 `setState`
- 没有给“只需要实时位移、不需要 React state 驱动 UI”的场景留出口
- 拖拽事件清理只覆盖 `pointermove` / `pointerup`，缺少 `pointercancel` 兜底

## 根因分析

造成卡顿的核心原因不是布局计算本身，而是拖拽期间的高频 React 更新：

- `pointermove` 是高频事件
- 每次事件都触发 `setDragDelta`
- `DraggableCard` 因状态变化重复 render
- `motion.div`、图片容器、阴影样式都被带入这条渲染链路

简单说，这个场景真正需要的是“高频更新 DOM transform”，而不是“高频驱动 React 重新渲染”。

## 优化方案

本次优化分为两部分。

### 一、扩展 useDrag，支持低开销拖拽模式

修改文件：

- `apps/web/src/hooks/useDrag.ts`

新增能力：

- 增加 `onDragMove` 回调，用于在拖拽过程中直接接收位移
- 增加 `syncDragDelta` 配置，允许调用方关闭 `dragDelta` 的 React state 同步
- 使用 `requestAnimationFrame` 合并 `dragDelta` 更新，避免无节制状态刷新
- 增加 `pointercancel` 清理逻辑
- 增加组件卸载时的事件与动画帧清理

这样做之后：

- 导航等仍然依赖 `dragDelta` 的场景，行为保持不变
- 图片卡片这类更敏感的拖拽场景，可以只在移动时更新 DOM，不再每次移动都触发 React render

### 二、重构 PictureStack 卡片拖拽链路

修改文件：

- `apps/web/src/components/pictures/PictureStack.tsx`

主要改动：

- 将卡片内容抽成 `PictureCardFace`，并使用 `memo` 包裹
- 将 `DraggableCard` 本身也做 `memo` 包裹
- 拖拽过程中不再依赖 `dragDelta` 驱动 render
- 改为在 `onDragMove` 中直接写入卡片 DOM 的 `transform`
- 只在 `onDragEnd` 时提交最终 offset 到 React state
- 将默认 offset 抽成稳定常量 `ZERO_OFFSET`
- 避免相同 offset 重复写入 state
- 使用 `translate3d(...)` 替代普通 `translate(...)`
- 拖拽中为元素增加 `will-change: transform`

这部分改动的实际效果是：

- 拖拽过程中卡片位置更新改为直接走浏览器渲染层
- React 只负责最终状态提交
- 卡片内部的 `motion.div` 和图片内容不再在拖拽期间反复重渲染

## 优化后的交互行为

优化后保留了以下原有行为：

- 点击卡片仍然打开 Lightbox 预览
- 拖拽结束后位置仍然会被记录
- 卡片仍然受容器边界约束
- 页面整体视觉样式和入场动画未被破坏

同时获得的改进包括：

- 拖拽更跟手
- 高频移动时更平滑
- 卡片多时性能更稳定

## 代码层面的关键变化总结

### useDrag

从：

- 每次 `pointermove` 都 `setDragDelta`

改为：

- 可选 `onDragMove`
- 可选关闭 `dragDelta` state 同步
- 必要时通过 `requestAnimationFrame` 节流 state 更新

### DraggableCard

从：

- `dragDelta -> render -> style.transform`

改为：

- `pointermove -> onDragMove -> 直接更新 DOM transform`
- `pointerup -> 计算最终 offset -> 提交 React state`

### 卡片子树

从：

- 拖拽时整个卡片内容都跟着 render

改为：

- 内容层通过 `memo` 稳定
- 拖拽只更新外层位置

## 验证结果

本次修改后执行了以下验证：

### 1. Type Check

命令：

```bash
pnpm --filter web type-check
```

结果：

- 通过

### 2. Lint

命令：

```bash
pnpm --filter web lint
```

结果：

- 通过
- 项目中存在若干历史 warning，但均与本次 `pictures` 拖拽优化无关

## 本次改动涉及文件

- `apps/web/src/hooks/useDrag.ts`
- `apps/web/src/components/pictures/PictureStack.tsx`
- `docs/PICTURES-DRAG-PERFORMANCE-OPTIMIZATION.md`

## 后续建议

如果后续还想继续提升 `pictures` 页面体感，可以考虑再做下面几项：

- 给拖拽中的卡片增加轻微抬起效果，例如缩放或阴影层级提升
- 如果图片数量继续增多，可以评估按视口或层级做懒渲染
- 对拖拽性能做一次浏览器 Performance 面板采样，确认是否还有阴影绘制或图片解码造成的额外开销

## 结论

这次问题的本质是：高频拖拽位移更新被放进了 React 渲染链路，导致交互不够轻。优化后的方案将“拖拽中的实时位移”与“拖拽结束后的状态提交”拆开处理，把高频操作下沉到 DOM transform 层，把 React 留给低频状态同步，解决了 `pictures` 页面拖拽卡顿的问题。
