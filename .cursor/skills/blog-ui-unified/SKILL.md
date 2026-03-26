---
name: blog-ui-unified
description: >-
  Unifies Next.js + Tailwind UI across the blog monorepo using existing theme
  tokens, typography, and shadcn-style components. Use when building or
  refactoring pages in apps/web, adjusting layouts, colors, spacing, or visual
  hierarchy, or when the user asks for prettier, more consistent, or
  \"design-system\" aligned UI, including Japanese-inspired minimal whitespace
  style (日式留白).
---

# Blog 统一 UI（apps/web）

## 优先读取的源码

在改 UI 前，先对齐项目已有决策（不要另起一套颜色或字体）：

- `apps/web/src/styles/globals.css` — `@theme` 与语义色（`content-*`、`surface-*`、`line-*`、`ui-*`）
- `apps/web/src/styles/themes.css` — 各 `data-theme` 下的 `--theme-*` 变量
- `apps/web/src/components/ui/*` — Button、Input、Dialog 等基件；新交互优先组合这里

## 硬性规则

1. **颜色**：正文与背景用语义 token（Tailwind：`text-content-primary`、`bg-surface-primary`、`border-line-primary` 等）。禁止在组件里写死 `#xxx` / `gray-500` 替代主题，除非该处是 SVG/图表等特殊且已注释原因。
2. **主题**：不假设只有亮色；样式须在切换 `data-theme` 后仍可读、对比度足够。
3. **组件**：同一交互形态全站共用同一套 UI 基件（例如按钮统一用 `components/ui/button` 的 variant/size，不要复制一份 class）。
4. **圆角与阴影**：与邻近卡片/弹层一致；全页避免混用多种「卡片圆角规格」（例如既有 `rounded-xl` 又有 `rounded-2xl` 堆在同一屏）。
5. **动效**：沿用项目节奏（如 body 上已有 `transition`）；新增 hover/focus 用短时长（~150–250ms），避免夸张弹跳。
6. **可访问性**：可点击区域有足够 hit area；焦点环使用主题 token（例如 `focus-visible:ring-2 focus-visible:ring-ui-primary`），不要去掉可见焦点。

## 版式与层级（瑞士式层级 + 本站字号）

- **层级**：每一屏只有一个主要视觉锚点（主标题或主卡片）；次级信息用 `text-content-secondary` / `text-content-muted` 降级，而不是靠更多颜色。
- **间距**：使用 Tailwind 间距刻度（4 的倍数）；区块之间优先 `gap` / `space-y-*`，少用手写 `margin` 魔术数。
- **行长**：可读文章区域保持舒适行长（与大屏 `.md-content` 一致的方向）；列表页卡片文字避免一行过长无断行。
- **对齐**：同一栏内左对齐优先；栅格或 max-width 与同路由其他页面对齐。

## 新建或改版时的自检清单

- [ ] 是否只用了 `globals.css` / `themes.css` 里已有语义色？
- [ ] 是否在亮/暗（或本项目多主题）下都看过一眼？
- [ ] 是否与同目录邻近页面共用同一套 `ui/*` 组件？
- [ ] 字重/字号阶梯是否与站点其它页一致（避免突然多出一种 display 字体尺寸）？
- [ ] 触摸/键盘是否都能用？焦点是否可见？

## 与「大师取向」的对应（实现时的心智模型）

项目不模仿某一商业产品皮肤，但实现上可对齐公认原则：**少即是多、层级清晰、诚实材料**（避免假立体、装饰压过信息）。可操作的归纳见 [reference.md](reference.md)。

## 风格预设：日式留白（可直接执行）

当用户明确提到「日式」「留白」「安静感」「极简杂志感」时，默认应用该取向：

1. **信息密度**：同屏减少装饰元素，保留 1 个主标题 + 1 个主要操作，其他信息后置。
2. **留白优先**：区块间距增大一级（例如 `space-y-6` -> `space-y-8`）；组件内部 padding 不同步膨胀。
3. **弱化边框**：优先 `border-line-primary/60` 或无边框 + 轻表面层，避免重描边卡片墙。
4. **低彩强调**：正文保持 `text-content-primary`；强调仅用于关键按钮/链接，不做大面积彩色底。
5. **动效克制**：hover 以轻微明度变化为主，不用大幅位移和阴影跳变。

详细参数与组件建议见 [reference.md](reference.md) 的“日式留白”章节。

## 与现有 Agent 的分工

- 涉及 **编辑器页面** 的版式、间距、层级时：可与 `.cursor/agents/blog-editor-designer.md` 的取向一致（极简边框、清晰层级）。
- 本 skill 覆盖 **全站** 任何 `apps/web` 界面，不仅编辑器。
