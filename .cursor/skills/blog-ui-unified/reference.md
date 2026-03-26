# 设计取向参考（可公开原则 → 本项目落点）

以下为业界常引用的、**不绑定特定品牌资产**的原则，用于在实现时做判断，而非照搬某一 App 的截图。

## Dieter Rams（系统产品思维）

1. **立异在于细节** — 默认样式保持克制；亮点留给内容与结构，而非每屏加一个新潮渐变。
2. **诚实** — 不搞假质感（无功能的拟物、过度玻璃拟态）；若用 `frosted-overlay`，与全局 frosted 变量一致。
3. **纯粹、极简** — 能用一个层级说清就不叠三级装饰边框。
4. **长久耐看** — 少追短期「炫酷」动效；与 `themes.css` 里低饱和方向一致。

## 国际主义排版 / Swiss（层级与网格）

1. **强网格、少中心对称花活** — 同一路由下 max-width、padding 模式一致。
2. **类型阶梯明确** — 标题/正文/辅助信息步进清晰；避免同一屏上多种无关 font-size 仅为了「好看」。
3. **留白是主动设计** — 区块间距大于组件内边距，层级一目了然。

## Massimo Vignelli（一致性）

1. **有限制的变化** — 同款卡片在不同页面应共享同一套圆角、阴影、hover。
2. **颜色服务信息与状态** — 强调色留给链接、主按钮、选中态；不把彩虹当背景。

## 现代产品界面（Linear / Vercel 等常被讨论的共同特征）

这些团队常被讨论的**共性**（非抄视觉）：高对比文字、极少边框或极轻 `line-*`、柔和表面 `surface-*`、清晰焦点态。本站已有 `--theme-shadow-*` 与 frosted 体系，**以主题变量为准**，不必引入第二套阴影语言。

## 日式留白（Japanese Minimal Whitespace）

目标不是“日系滤镜”，而是**安静、呼吸感、内容优先**。适用于文章页、详情页、设置页和表单页。

1. **留白比例**
   - 页面主容器优先给更宽松的垂直节奏：区块间距建议 `space-y-8` / `space-y-10`。
   - 组件内边距保持中等（如卡片 `p-5` 或 `p-6`），避免“外松内也松”导致信息漂浮。
2. **文字层级**
   - 标题保持克制：`text-2xl`/`text-3xl` + `font-semibold` 足够，不追求超大 display。
   - 辅助信息固定降级到 `text-content-secondary` 或 `text-content-muted`，减少灰度层数切换。
3. **颜色与对比**
   - 背景以 `bg-surface-primary` / `bg-surface-secondary` 为主，强调色仅点到即止。
   - 大面积彩色块只给关键 CTA 或状态，不作为长期背景底色。
4. **边框与阴影**
   - 优先轻边框：`border-line-primary/60`；次选“无边框 + very soft shadow”。
   - 避免同屏出现多种阴影层级，保持“像纸张堆叠”而非“悬浮卡片瀑布”。
5. **交互细节**
   - Hover 用亮度/表面变化（如 `bg-surface-hover`），少用位移。
   - Focus 明确但不刺眼：`focus-visible:ring-2 focus-visible:ring-ui-primary`。

### 推荐组件配方（Tailwind 语义类）

- **内容卡片**：`bg-surface-primary border border-line-primary/60 rounded-xl p-6`
- **次级容器**：`bg-surface-secondary rounded-lg p-4`
- **主标题**：`text-2xl font-semibold text-content-primary tracking-tight`
- **说明文案**：`text-sm text-content-secondary leading-6`
- **主按钮**：沿用 `ui/button` 的默认主按钮 variant，不额外叠加强饱和背景

### 反例（应避免）

- 在“留白”页面里叠加多层重阴影 + 高饱和渐变背景。
- 为了“高级感”把正文灰到接近不可读。
- 大量使用 `backdrop-blur` 导致内容发虚、阅读疲劳。

### 两侧留白的利用（氛围层优先）

当页面内容使用 `max-w-* mx-auto` 形成大屏两侧留白时，优先把两侧当作“呼吸空间”，只做**氛围**不做信息承载：

- **只做装饰，不放信息**：两侧不要放可读文字/卡片列表，避免与正文争抢注意力。
- **不挡交互**：装饰层必须 `pointer-events-none`，避免影响选择/点击/滚动。
- **强度默认极低**：opacity 低于正文对比层级；宁可“若有若无”，也不要明显“帘子感”。\n+- **响应式**：默认仅 `lg`/`xl` 启用；中小屏保持内容优先。\n+- **主题一致**：装饰必须来自主题变量（`--theme-*` / `surface-*` / `accent-*`），禁止写死颜色。\n+
如果未来需要功能型侧栏（TOC/相关阅读），建议另起一套“内容侧栏布局”组件，并按路由选择性开启，避免全站强制占宽。

## 本项目落地速查

| 原则     | 在代码里的体现 |
|----------|----------------|
| 一致表面 | `bg-surface-primary` / `secondary` / `glass` |
| 一致文字 | `text-content-*` |
| 一致分隔 | `border-line-*` |
| 主操作   | `Button` + `ui-primary` 系 token |
| 破坏性   | `ui-destructive` 系 |

若新需求与上表冲突，先扩展 `themes.css` 中变量并在 `@theme` 中Expose，再使用 — 避免在 TSX 内扩散裸色值。
